import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { smoke } from "./smoke.mjs";

test("smoke checks health, CORS and the exact release using local HTTP", async () => {
  const revision = "candidate";
  let origin;
  let deployed = revision;
  let database = "up";
  let cors = true;
  let bundle = true;
  const server = createServer((request, response) => {
    const json = (body) => response.end(JSON.stringify(body));
    switch (request.url) {
      case "/health":
        response.setHeader("X-BrewLite-Revision", deployed);
        return json({ status: "ok", database });
      case "/products":
        if (cors) response.setHeader("Access-Control-Allow-Origin", origin);
        return json([{ id: 1 }]);
      case "/products/1":
        return json({ options: { sizes: ["S", "M", "L"], toppings: [] } });
      case "/release.json":
        return json({ revision, api: origin });
      case "/":
        return response.end('<script src="/_next/static/menu.js"></script>');
      case "/_next/static/menu.js":
        return response.end(bundle ? JSON.stringify(origin) : "incorrect bundle");
      default:
        response.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  const settings = { api: origin, web: origin, revision };
  try {
    await smoke(settings);
    deployed = "previous";
    await assert.rejects(smoke(settings), /revision mismatch/);
    deployed = revision;
    database = "down";
    await assert.rejects(smoke(settings), /health/);
    database = "up";
    cors = false;
    await assert.rejects(smoke(settings), /origin rejected/);
    cors = true;
    bundle = false;
    await assert.rejects(smoke(settings), /missing from Web JavaScript/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
