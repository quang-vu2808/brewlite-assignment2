import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { release } from "./release.mjs";
import { renderService } from "./render.mjs";

const revision = "a".repeat(40) + "-101-1";
const previous = "b".repeat(40) + "-100-1";
const api = "https://example-api.onrender.com";
const web = "https://example-web.onrender.com";
const pair = (digit, rev) => Object.fromEntries([
  ["revision", rev],
  ...["api", "web"].map((name) => [name, "ghcr.io/example/brewlite-" + name + "@sha256:" + digit.repeat(64)]),
]);

async function scenario(options = {}) {
  const stable = pair("b", previous);
  const platformDigest = "sha256:" + "f".repeat(64);
  const manifest = Buffer.from(JSON.stringify({
    schemaVersion: 2,
    mediaType: "application/vnd.oci.image.index.v1+json",
    manifests: [{
      mediaType: "application/vnd.oci.image.manifest.v1+json",
      digest: platformDigest,
      platform: { os: "linux", architecture: "amd64" },
    }],
  }));
  if (options.tagged) stable.api = stable.api.split("@")[0] + "@sha256:" +
    createHash("sha256").update(manifest).digest("hex");
  const inspected = [];
  const candidate = { ...pair("a", revision), apiOrigin: api };
  const settings = { api, web, revision, candidate, stable, repository: "example/brewlite" };
  const posts = [];
  const checks = [];
  const report = {};
  let nextId = 0;
  const key = "fake-api-key-for-redaction-test";
  const privateBody = "fake-db-password-for-redaction-test";
  function client(name) {
    let clock = 0;
    let listCalls = 0;
    const entry = (image, status) => ({ id: "dep-" + (++nextId), image: { ref: image }, status });
    const deploys = [entry(stable[name], "live")];
    if (name === "api" && options.tagged) {
      deploys[0].image = {
        ref: stable.api.split("@")[0] + ":sha-" +
          (options.tagged === "wrong-tag" ? revision : previous).split("-")[0],
        sha: options.tagged === "wrong-sha" ? "sha256:" + "d".repeat(64) : platformDigest,
      };
      deploys.push(entry("nginx:old", "deactivated"));
    }
    const json = (data) => new Response(JSON.stringify(data));
    return renderService({
      key, service: "srv-" + name, now: () => clock, sleep: async (ms) => { clock += ms; },
      rolloutMs: 10_000, reconcileMs: 10_000,
      loadManifest: async (image) => {
        inspected.push(image);
        if (image !== stable.api || options.tagged === "registry-failure") throw new Error(privateBody);
        if (options.tagged === "unverified-manifest") return Buffer.from("{}");
        return Buffer.concat([manifest, Buffer.from("\n")]);
      },
      request: async (url, request) => {
        assert.equal(request.headers.Authorization, "Bearer " + key);
        const parsed = new URL(url);
        assert.equal(parsed.origin, "https://api.render.com");
        const path = parsed.pathname.split("/").at(-1);
        if (request.method === "POST") {
          const image = JSON.parse(request.body).imageUrl;
          assert.ok([candidate[name], stable[name]].includes(image));
          posts.push([name, image]);
          const kind = image === candidate[name] ? "candidate" : "stable";
          const fault = options[name + kind];
          if (fault === "invisible") throw new Error(key + privateBody);
          const status = fault === "failed" ? "update_failed" : fault === "pending" ? "queued" : "live";
          if (status === "live") {
            for (const deploy of deploys) if (deploy.status === "live") deploy.status = "deactivated";
          }
          const deployment = entry(image, status);
          deploys.unshift(deployment);
          if (fault === "timeout") throw new Error(key + privateBody);
          if (image === stable.api && options.tagged) deployment.image.sha = platformDigest;
          if (fault === "wrong-digest") deployment.image.sha = "sha256:" + "c".repeat(64);
          return json(deployment);
        }
        if (path === "deploys") {
          const cursor = parsed.searchParams.get("cursor");
          if (cursor === null) listCalls++;
          if (name === "web" && listCalls === 2 && options.externalWeb === "invalid-next-page") {
            if (cursor !== null) return json({ deployments: [] });
          } else if (cursor === null && name === "web" && listCalls === 2 && options.externalWeb) {
            if (options.externalWeb === "unavailable") return new Response(privateBody, { status: 500 });
            if (options.externalWeb === "replaced") deploys[0].status = "deactivated";
            const status = { replaced: "live", pending: "queued", failed: "update_failed" }[options.externalWeb];
            deploys.unshift(entry(stable.web, status));
          }
          if (options.preflight === name) return new Response(privateBody, { status: 500 });
          const start = cursor === null ? 0 : deploys.findIndex(({ id }) => id === cursor) + 1;
          if (cursor !== null && start === 0) return new Response(null, { status: 400 });
          return json(deploys.slice(start, start + 1).map((deploy) => ({ deploy, cursor: deploy.id })));
        }
        return json(deploys.find(({ id }) => id === path));
      },
    });
  }

  const clients = { api: client("api"), web: client("web") };
  if (options.manifest === "invalid") settings.stable = { ...stable, api: "ghcr.io/example/brewlite-api:latest" };
  if (options.manifest === "wrong-stable-digest") settings.stable = { ...stable, api: pair("c", previous).api };
  if (options.manifest === "first") settings.stable = { firstRelease: true };
  await release(settings, { clients, report, verify: async (rev) => {
    checks.push(rev);
    if ((rev === revision && options.smoke) || (rev === previous && options.stableSmoke)) {
      throw new Error(key + privateBody);
    }
  } });
  assert.doesNotMatch(JSON.stringify(report), new RegExp(key + "|" + privateBody));
  return { posts, checks, report, stable, candidate, inspected };
}

for (const [title, options, stage] of [
  ["API deploy fails", { apicandidate: "failed" }, "api"],
  ["Web deploy fails after API", { webcandidate: "failed" }, "web"],
  ["candidate smoke fails", { smoke: true }, "smoke"],
  ["candidate POST times out after being accepted", { apicandidate: "timeout" }, "api"],
  ["Render reports a conflicting digest", { apicandidate: "wrong-digest" }, "api"],
]) {
  test(title + ": stable pair verified and release still failed", async () => {
    const { report, posts, checks, stable, candidate } = await scenario(options);
    const attempted = stage === "api" ? [["api", candidate.api]] : [["api", candidate.api], ["web", candidate.web]];
    assert.deepEqual(posts.slice(0, attempted.length), attempted);
    const expectedRecovery = stage === "api" ? [["api", stable.api]] : [["api", stable.api], ["web", stable.web]];
    assert.deepEqual(posts.slice(attempted.length).sort(), expectedRecovery);
    assert.deepEqual(report.services, { api: "restored", web: stage === "api" ? "unchanged" : "restored" });
    assert.equal(report.failedStage, stage);
    assert.equal(report.release, "failed");
    assert.equal(report.rollback, "passed");
    assert.deepEqual(checks, stage === "smoke" ? [revision, previous] : [previous]);
  });
}

test("unknown or still pending candidate does not race recovery on that service", async () => {
  for (const fault of ["invisible", "pending"]) {
    const { report, posts, stable, candidate } = await scenario({ webcandidate: fault });
    assert.deepEqual(posts, [["api", candidate.api], ["web", candidate.web], ["api", stable.api]]);
    assert.deepEqual(report.services, { api: "restored", web: "candidate-unresolved" });
    assert.equal(report.rollback, "failed");
  }
});

test("one failed rollback still allows restoration of the other service", async () => {
  for (const failed of ["api", "web"]) {
    const { report } = await scenario({ smoke: true, [failed + "stable"]: "failed" });
    assert.equal(report.services[failed], "failed");
    assert.equal(report.services[failed === "api" ? "web" : "api"], "restored");
    assert.equal(report.rollback, "failed");
    assert.equal(report.release, "failed");
  }
});

test("rollback POST timeout can be verified without submitting twice", async () => {
  const { report, posts, stable } = await scenario({ smoke: true, webstable: "timeout" });
  assert.equal(report.rollback, "passed");
  assert.equal(posts.filter(([, image]) => image === stable.web).length, 1);
});

test("both digests restored but stable smoke fails", async () => {
  const { report } = await scenario({ smoke: true, stableSmoke: true });
  assert.deepEqual(report.services, { api: "restored", web: "restored" });
  assert.equal(report.stableSmoke, "failed");
  assert.equal(report.rollback, "failed");
});

for (const options of [{ manifest: "invalid" }, { manifest: "wrong-stable-digest" }, { preflight: "web" }]) {
  test("preflight failure makes no POST: " + JSON.stringify(options), async () => {
    const { report, posts, checks } = await scenario(options);
    assert.deepEqual(posts, []);
    assert.deepEqual(checks, []);
    assert.equal(report.release, "failed");
    assert.equal(report.rollback, "not-started");
  });
}

test("first release failure has no stable target", async () => {
  const { report, posts, checks } = await scenario({ manifest: "first", apicandidate: "failed" });
  assert.equal(posts.length, 1);
  assert.deepEqual(checks, []);
  assert.equal(report.rollback, "no-stable-release");
  assert.equal(report.release, "failed");
});

test("successful release verifies candidate only", async () => {
  const { report, posts, checks } = await scenario();
  assert.equal(posts.length, 2);
  assert.deepEqual(checks, [revision]);
  assert.equal(report.release, "passed");
});


test("tagged stable deploy with a verified platform digest supports rollback by pinned digest", async () => {
  const { report, inspected, posts, stable, checks } = await scenario({ tagged: "valid", smoke: true });
  assert.equal(report.release, "failed");
  assert.equal(report.rollback, "passed");
  assert.ok(inspected.length >= 1);
  assert.ok(inspected.every((image) => image === stable.api));
  assert.ok(posts.some(([service, image]) => service === "api" && image === stable.api));
  assert.deepEqual(checks, [revision, previous]);
});

for (const tagged of ["wrong-tag", "wrong-sha", "unverified-manifest", "registry-failure"]) {
  test("tagged production image fails closed: " + tagged, async () => {
    const { report, posts } = await scenario({ tagged });
    assert.deepEqual(posts, []);
    assert.equal(report.release, "failed");
    assert.equal(report.rollback, "not-started");
    assert.match(report.preflightError, /^api: /);
  });
}

for (const externalWeb of ["replaced", "pending", "failed", "unavailable", "invalid-next-page"]) {
  test("unattempted Web deploy fails closed when verification detects " + externalWeb, async () => {
    const { report, posts, stable, candidate, checks } = await scenario({ apicandidate: "failed", externalWeb });
    assert.deepEqual(posts, [["api", candidate.api], ["api", stable.api]]);
    assert.deepEqual(report.services, { api: "restored", web: "unchanged-unverified" });
    assert.deepEqual(checks, [previous]);
    assert.equal(report.stableSmoke, "passed");
    assert.equal(report.rollback, "failed");
  });
}

function paginationClient(respond) {
  const cursors = [];
  const client = renderService({
    key: "mock-render-key",
    service: "srv-api",
    request: async (url, request) => {
      assert.equal(request.method, undefined);
      const query = new URL(url).searchParams;
      assert.equal(query.get("limit"), "100");
      const cursor = query.get("cursor");
      cursors.push(cursor);
      const body = respond(cursors.length - 1);
      return body instanceof Response ? body : Response.json(body);
    },
  });
  return { client, cursors };
}

const row = (id, cursor, status = "deactivated") => ({ cursor, deploy: { id, status } });

test("Render list follows the last row cursor, even on short pages", async () => {
  const pages = [[row("dep-1", "first"), row("dep-2", "opaque+/=")], [row("dep-3", "last")], []];
  const { client, cursors } = paginationClient((page) => pages[page]);
  const snapshot = await client.prepare();
  assert.deepEqual([...snapshot.ids], ["dep-1", "dep-2", "dep-3"]);
  assert.deepEqual(cursors, [null, "opaque+/=", "last"]);
});

for (const [label, secondPage, error] of [
  ["repeated cursor", [row("dep-2", "first")], /repeated.*cursor/],
  ["missing cursor", [row("dep-2", undefined)], /invalid.*cursor/i],
  ["invalid response shape", { deployments: [] }, /invalid.*page/i],
  ["duplicate deployment", [row("dep-1", "next")], /duplicate.*deployment/i],
  ["cursor rejected by Render", new Response("mock-render-key", { status: 400 }), /^Error: Render request failed$/],
]) {
  test("Render list fails closed on " + label, async () => {
    const { client, cursors } = paginationClient((page) => page === 0 ? [row("dep-1", "first")] : secondPage);
    await assert.rejects(client.prepare(), error);
    assert.deepEqual(cursors, [null, "first"]);
  });
}

test("Render list stops at the pagination limit without returning a partial snapshot", async () => {
  const { client, cursors } = paginationClient((page) => [row("dep-" + page, "cursor-" + page)]);
  await assert.rejects(client.prepare(), /pagination limit reached/);
  assert.equal(cursors.length, 10);
});
