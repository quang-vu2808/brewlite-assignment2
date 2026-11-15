import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { promisify } from "node:util";

const exec = promisify(execFile);
const indexTypes = new Set([
  "application/vnd.oci.image.index.v1+json",
  "application/vnd.docker.distribution.manifest.list.v2+json",
]);
const manifestTypes = new Set([
  "application/vnd.oci.image.manifest.v1+json",
  "application/vnd.docker.distribution.manifest.v2+json",
]);

async function readManifest(image) {
  const { stdout } = await exec("docker", ["buildx", "imagetools", "inspect", "--raw", image], {
    encoding: "buffer", timeout: 30_000, maxBuffer: 1024 * 1024,
  });
  return stdout;
}

function linuxAmd64Digest(raw, expectedDigest) {
  // The CLI can append a newline. Only parse bytes whose hash matches the pinned digest.
  const withoutNewline = raw.at(-1) === 10 ? raw.subarray(0, -1) : raw;
  const payload = [raw, withoutNewline].find((bytes) =>
    "sha256:" + createHash("sha256").update(bytes).digest("hex") === expectedDigest);
  if (!payload) return;
  const index = JSON.parse(payload);
  if (index.schemaVersion !== 2 || !indexTypes.has(index.mediaType) || !Array.isArray(index.manifests)) return;
  const descriptors = index.manifests.filter((item) =>
    item?.platform?.os === "linux" && item.platform.architecture === "amd64");
  if (descriptors.length === 1 && manifestTypes.has(descriptors[0].mediaType) &&
      /^sha256:[0-9a-f]{64}$/.test(descriptors[0].digest ?? "")) {
    return descriptors[0].digest;
  }
}

export class StableImageUnverified extends Error {}

const failed = new Set(["build_failed", "update_failed", "pre_deploy_failed", "canceled", "deactivated"]);
const finished = (deploy) => deploy.status === "live" || failed.has(deploy.status);
const validId = (id) => /^dep-[a-z0-9]+$/.test(id ?? "");
const matches = (deploy, image) => {
  const digest = image.split("@")[1];
  const { ref, sha } = deploy.image ?? {};
  const resolved = /^[a-f0-9]{64}$/.test(sha ?? "") ? "sha256:" + sha : sha;
  return (!resolved || resolved === digest) && (ref === image || resolved === digest);
};

export function renderService({ key, service, request = fetch, loadManifest = readManifest, now = Date.now,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  rolloutMs = 600_000, reconcileMs = 120_000 }) {
  if (!key || !/^srv-[a-z0-9]+$/.test(service ?? "")) throw new Error("Invalid Render configuration");
  const endpoint = 'https://api.render.com/v1/services/' + service + '/deploys';
  async function render(path = "", options = {}) {
    try {
      const timeout = AbortSignal.timeout(15_000);
      const signal = options.signal ? AbortSignal.any([timeout, options.signal]) : timeout;
      const response = await request(endpoint + path, {
        ...options, redirect: "error", signal,
        headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      });
      if (response.ok) return await response.json();
    } catch {
      // Do not propagate provider bodies or exception messages into CI logs.
    }
    throw new Error("Render request failed");
  }

  async function list() {
    const limit = 100;
    const maxPages = 10;
    const signal = AbortSignal.timeout(30_000);
    const query = new URLSearchParams({ limit: String(limit) });
    const deployments = [];
    const ids = new Set();
    const cursors = new Set();
    for (let page = 0; page < maxPages; page++) {
      const rows = await render("?" + query, { signal });
      if (!Array.isArray(rows) || rows.length > limit) throw new Error("Invalid Render deployment page");
      // Render returns a cursor per row. Keep following it until an empty page.
      if (rows.length === 0) return deployments;
      for (const row of rows) {
        const deploy = row?.deploy;
        const cursor = row?.cursor;
        if (typeof deploy?.id !== "string" || !validId(deploy.id) || typeof deploy.status !== "string" ||
            ids.has(deploy.id)) {
          throw new Error("Invalid or duplicate Render deployment");
        }
        if (typeof cursor !== "string" || !cursor.trim() || cursors.has(cursor)) {
          throw new Error("Invalid or repeated Render deployment cursor");
        }
        ids.add(deploy.id);
        cursors.add(cursor);
        deployments.push(deploy);
      }
      query.set("cursor", rows.at(-1).cursor);
    }
    throw new Error("Render deployment pagination limit reached");
  }

  async function matchesPlatform(deploy, image) {
    const resolved = deploy.image?.sha;
    const sha = /^[a-f0-9]{64}$/.test(resolved ?? "") ? "sha256:" + resolved : resolved;
    if (!/^sha256:[0-9a-f]{64}$/.test(sha ?? "")) return false;
    const child = linuxAmd64Digest(await loadManifest(image), image.split("@")[1]);
    return child === sha;
  }

  async function matchesPinned(deploy, image) {
    return matches(deploy, image) ||
      (deploy.image?.ref === image && await matchesPlatform(deploy, image).catch(() => false));
  }

  async function prepare(expected, revision) {
    const deployments = await list();
    if (deployments.some((deploy) => !finished(deploy))) throw new Error("Render deployment already pending");
    const live = deployments.filter((deploy) => deploy.status === "live");
    if (expected) {
      const [repository] = expected.split("@");
      const expectedTag = repository + ":sha-" + revision?.split("-")[0];
      const ref = live[0]?.image?.ref;
      if (live.length !== 1 || (ref !== expected && ref !== expectedTag)) {
        throw new StableImageUnverified("Expected one live deployment with the stable image ref or its release tag");
      }
      if (!matches(live[0], expected)) {
        let verified;
        try {
          verified = await matchesPlatform(live[0], expected);
        } catch {
          throw new StableImageUnverified("Could not inspect the pinned stable GHCR manifest");
        }
        if (!verified) {
          throw new StableImageUnverified("Render SHA matches neither the stable GHCR digest nor its verified linux/amd64 manifest");
        }
      }
    }
    return { ids: new Set(deployments.map(({ id }) => id)), liveId: live[0]?.id };
  }

  async function wait(operation, budget) {
    const deadline = now() + budget;
    do {
      // GETs are safe to retry; POSTs are never retried.
      if (!operation.id) {
        const snapshot = await list().catch(() => []);
        const newer = snapshot.filter(({ id }) => !operation.before.ids.has(id));
        // Adopt only one unambiguous new attempt for this digest.
        if (newer.length === 1 && await matchesPinned(newer[0], operation.image)) operation.id = newer[0].id;
      }
      if (operation.id) {
        const deploy = await render("/" + operation.id).catch(() => null);
        if (deploy?.id === operation.id && finished(deploy)) {
          operation.settled = true;
          operation.live = deploy.status === "live" && await matchesPinned(deploy, operation.image);
          return;
        }
      }
      if (now() < deadline) await sleep(5000);
    } while (now() < deadline);
    throw new Error("Render deployment state unresolved");
  }

  async function deploy(operation) {
    operation.attempted = true;
    const created = await render("", {
      method: "POST", body: JSON.stringify({ imageUrl: operation.image }),
    });
    if (!validId(created?.id) || operation.before.ids.has(created.id)) throw new Error("Invalid Render deployment ID");
    operation.id = created.id;
    await wait(operation, rolloutMs);
    if (!operation.live) throw new Error("Requested Render digest did not become live");
  }

  async function reconcile(operation) {
    if (operation.attempted && !operation.settled) await wait(operation, reconcileMs);
  }

  return { prepare, deploy, reconcile };
}
