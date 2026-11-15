import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { renderService, StableImageUnverified } from "./render.mjs";
import { verifyRelease } from "./smoke.mjs";

const services = ["api", "web"];
const revisionValid = (revision) => typeof revision === "string" && /^[0-9a-f]{40}-\d+-\d+$/.test(revision);
const originValid = (url) => /^https:\/\/[a-z0-9-]+\.onrender\.com$/.test(url ?? "");

export function validateRelease({ candidate, stable, repository, revision, api, web }) {
  if (!/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i.test(repository ?? "") ||
      !originValid(api) || !originValid(web) || api === web) throw new Error("Invalid release settings");
  const prefix = "ghcr.io/" + repository.toLowerCase();
  const validPair = (pair) => revisionValid(pair?.revision) && services.every((name) => {
    const image = pair[name];
    const start = prefix + "-" + name + "@sha256:";
    return typeof image === "string" && image.startsWith(start) && /^[0-9a-f]{64}$/.test(image.slice(start.length));
  });
  if (!validPair(candidate) || candidate.revision !== revision || candidate.apiOrigin !== api) {
    throw new Error("Invalid candidate manifest");
  }
  if (stable?.firstRelease === true && Object.keys(stable).length === 1) return;
  if (!validPair(stable) || Object.hasOwn(stable, "firstRelease")) throw new Error("Invalid stable manifest");
}

export async function release(settings, { clients, verify, report }) {
  const { candidate, stable } = settings;
  const operations = {};
  let preparingService;
  try {
    validateRelease(settings);
    for (const name of services) {
      preparingService = name;
      operations[name] = {
        image: candidate[name],
        before: await clients[name].prepare(stable.firstRelease ? undefined : stable[name], stable.revision),
      };
    }
    for (const name of services) {
      report.failedStage = name;
      await clients[name].deploy(operations[name]);
    }
    report.failedStage = "smoke";
    await verify(candidate.revision);
    delete report.failedStage;
    report.release = "passed";
  } catch (error) {
    if (error instanceof StableImageUnverified) {
      report.preflightError = preparingService + ": " + error.message;
    }
    report.release = "failed";
    report.failedStage ??= "preflight";
    if (!services.some((name) => operations[name]?.attempted)) {
      report.rollback = "not-started";
      return;
    }
    if (stable.firstRelease) {
      report.rollback = "no-stable-release";
      return;
    }
    report.services = {};
    report.rollbackDeploys = {};
    await Promise.all(services.map(async (name) => {
      const client = clients[name];
      const operation = operations[name];
      if (operation?.attempted !== true) {
        report.services[name] = "unchanged-unverified";
        try {
          const current = await client.prepare(stable[name], stable.revision);
          const before = operation.before;
          if (current.liveId === before.liveId && current.ids.size === before.ids.size &&
              [...current.ids].every((id) => before.ids.has(id))) {
            report.services[name] = "unchanged";
          }
        } catch {
          // Missing, pending or unverified deployments cannot count as unchanged.
        }
        return;
      }
      try {
        await client.reconcile(operation);
      } catch {
        report.services[name] = "candidate-unresolved";
        return;
      }
      let recovery;
      try {
        recovery = { image: stable[name], before: await client.prepare() };
        await client.deploy(recovery);
      } catch {
        if (recovery?.attempted) {
          try {
            await client.reconcile(recovery);
          } catch {
            // Uncertain rollback remains failed and requires manual inspection.
          }
        }
      }
      if (recovery?.id) report.rollbackDeploys[name] = recovery.id;
      report.services[name] = recovery?.live ? "restored" : "failed";
    }));
    try {
      await verify(stable.revision);
      report.stableSmoke = "passed";
    } catch {
      report.stableSmoke = "failed";
    }
    report.rollback = report.stableSmoke === "passed" &&
      services.every((name) => ["restored", "unchanged"].includes(report.services[name])) ? "passed" : "failed";
  } finally {
    report.candidateDeploys = Object.fromEntries(services
      .filter((name) => operations[name]?.id).map((name) => [name, operations[name].id]));
  }
}

async function main() {
  const report = { release: "failed", failedStage: "preflight", rollback: "not-started" };
  try {
    const env = process.env;
    const settings = {
      candidate: JSON.parse(await readFile("candidate.json", "utf8")),
      stable: JSON.parse(await readFile("rollback.json", "utf8")),
      repository: env.GITHUB_REPOSITORY,
      revision: env.RELEASE_REVISION,
      api: env.PROD_API_URL,
      web: env.PROD_WEB_URL,
    };
    const key = env.RENDER_API_KEY;
    if (env.API_SERVICE === env.WEB_SERVICE) throw new Error("Render service IDs must be distinct");
    await release(settings, {
      clients: {
        api: renderService({ key, service: env.API_SERVICE }),
        web: renderService({ key, service: env.WEB_SERVICE }),
      },
      verify: (revision) => verifyRelease({ api: settings.api, web: settings.web, revision }),
      report,
    });
  } catch {
    // Avoid logging raw I/O errors, environment values or provider response bodies.
  }
  if (report.release !== "passed") process.exitCode = 1;
  console.log(JSON.stringify(report));
  await writeFile("rollout-result.json", JSON.stringify(report, null, 2) + "\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main().catch(() => {
    console.error("Unable to save rollout result");
    process.exitCode = 1;
  });
}
