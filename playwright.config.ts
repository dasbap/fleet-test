import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:5173";
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  // Stabilise l'exécution : séquentiel en local, parallèle maîtrisé en CI.
  workers: isCI ? 2 : 1,
  expect: {
    timeout: 5_000,
  },
  retries: isCI ? 2 : 0,
  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/e2e-report.json" }],
    ["junit", { outputFile: "test-results/e2e-junit.xml" }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5173 --strictPort",
    url: BASE_URL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
  // Chromium (desktop + mobile), Firefox et WebKit (desktop) — aligné sur `playwright:install:browsers`.
  projects: [
    {
      name: "chromium-desktop",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "chromium-mobile",
      use: {
        ...devices["Pixel 5"],
      },
    },
    {
      name: "firefox-desktop",
      use: {
        ...devices["Desktop Firefox"],
      },
    },
    {
      name: "webkit-desktop",
      use: {
        ...devices["Desktop Safari"],
      },
    },
  ],
});

