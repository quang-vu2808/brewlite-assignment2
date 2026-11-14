import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  retries: 0,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_WEB_URL ?? "http://localhost:3080",
    // Traces can capture registration credentials and authorization headers.
    trace: "off",
  },
  projects: [{
    name: "chromium",
    use: {
      browserName: "chromium",
      ...(process.env.PLAYWRIGHT_CHROMIUM_CHANNEL === "chrome" ? { channel: "chrome" } : {}),
    },
  }],
});
