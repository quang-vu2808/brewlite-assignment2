const { RENDER_API_KEY: key, RENDER_SERVICE_ID: service, RELEASE_IMAGE: image } = process.env;
const terminal = new Set(["build_failed", "update_failed", "pre_deploy_failed", "canceled", "deactivated"]);
if (!key || !/^srv-[a-z0-9]+$/.test(service ?? "") ||
    !/^ghcr\.io\/[a-z0-9._/-]+@sha256:[a-f0-9]{64}$/.test(image ?? "")) {
  throw new Error("Missing Render key, service ID or immutable GHCR image");
}

const endpoint = `https://api.render.com/v1/services/${service}/deploys`;
async function render(url, options = {}) {
  const response = await fetch(url, {
    ...options, redirect: "error", signal: AbortSignal.timeout(15_000),
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error(`Render API HTTP ${response.status}`);
  return response.json();
}

// Never retry the POST automatically. A timed-out request might already be queued.
const created = await render(endpoint, {
  method: "POST", body: JSON.stringify({ imageUrl: image }),
});
if (!/^dep-[a-z0-9]+$/.test(created.id ?? "")) throw new Error("Missing Render deployment ID");
console.log(`Render deployment: ${created.id}`);
const deadline = Date.now() + 600_000;
while (Date.now() < deadline) {
  const deployment = await render(`${endpoint}/${created.id}`);
  if (terminal.has(deployment.status)) throw new Error("Render rollout failed");
  if (deployment.status === "live") {
    const digest = image.split("@")[1];
    if (deployment.image?.ref !== image && deployment.image?.sha !== digest) {
      throw new Error("Live Render deployment does not identify the requested image");
    }
    console.log("Requested Render image is live");
    process.exit(0);
  }
  await new Promise((resolve) => setTimeout(resolve, 5000));
}
throw new Error("Render deployment did not become live before the deadline");
