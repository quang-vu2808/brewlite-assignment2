import { pathToFileURL } from "node:url";

export async function smoke({ api, web, revision }) {
  const get = async (url, headers = {}) => {
    const response = await fetch(url, {
      headers, redirect: "error", signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Smoke received HTTP ${response.status}`);
    return response;
  };

  const health = await get(`${api}/health`);
  const status = await health.json();
  if (status.status !== "ok" || status.database !== "up" ||
      health.headers.get("x-brewlite-revision") !== revision) {
    throw new Error("API health or revision mismatch");
  }

  const products = await get(`${api}/products`, { Origin: web });
  if (products.headers.get("access-control-allow-origin") !== web) {
    throw new Error("Web origin rejected");
  }
  const catalog = await products.json();
  if (!Array.isArray(catalog) || !/^\d+$/.test(String(catalog[0]?.id))) {
    throw new Error("Catalog is empty or invalid");
  }
  const detail = await (await get(`${api}/products/${catalog[0].id}`)).json();
  if (detail.options?.sizes?.length !== 3 || !Array.isArray(detail.options?.toppings)) {
    throw new Error("Product options missing");
  }

  const manifest = await (await get(`${web}/release.json`)).json();
  if (manifest.revision !== revision || manifest.api !== api) {
    throw new Error("Web revision or build API URL mismatch");
  }
  const html = await (await get(web)).text();
  const assets = [...new Set(html.match(/\/_next\/static\/[^"'\s<>]+\.js/g))];
  for (const path of assets) {
    const source = await (await get(`${web}${path}`)).text();
    if (source.includes(api)) return;
  }
  throw new Error("Expected API URL missing from Web JavaScript");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const api = process.env.PROD_API_URL;
  const web = process.env.PROD_WEB_URL;
  const revision = process.env.RELEASE_REVISION;
  const httpsOrigin = (value) => /^https:\/\/[a-z0-9-]+\.onrender\.com$/.test(value ?? "");
  if (!httpsOrigin(api) || !httpsOrigin(web) || api === web || !/^[0-9a-f]{40}-\d+-\d+$/.test(revision ?? "")) {
    throw new Error("Expected distinct Render HTTPS origins and release revision");
  }
  const deadline = Date.now() + 300_000;
  for (;;) {
    try {
      await smoke({ api, web, revision });
      console.log("HTTPS release smoke passed");
      break;
    } catch {
      if (Date.now() >= deadline) throw new Error("HTTPS release smoke timed out");
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}
