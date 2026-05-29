import { defineConfig, devices } from "@playwright/test";

/** E2E contre un build déjà servi (ex. `npx vite preview --port 4176`). */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45_000,
  workers: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:4176",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium-desktop", use: { ...devices["Desktop Chrome"] } }],
});
