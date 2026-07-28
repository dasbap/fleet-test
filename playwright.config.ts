import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:5173";
const isCI = !!process.env.CI;
const isLiveE2EEnabled =
  process.env.RUN_E2E_LIVE === "1" || process.env.RUN_E2E_LIVE === "true";
const generalTestIgnore = [
  "**/onboarding-wizard.spec.ts",
  ...(isLiveE2EEnabled ? [] : ["**/golden-path-rls.spec.ts"]),
];

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: generalTestIgnore,
  timeout: 30_000,
  // Les specs E2E manipulent les mêmes mocks et routes applicatives; garder
  // l'ordre séquentiel en CI évite les timeouts de montage SPA inter-specs.
  workers: 1,
  expect: {
    timeout: 5_000,
  },
  retries: 0,
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
    env: {
      ESAMBA_E2E: "1",
    },
    url: BASE_URL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
  // Chromium (desktop + mobile), Firefox et WebKit (desktop) — aligné sur `playwright:install:browsers`.
  projects: [
    {
      name: "chromium-desktop",
      testIgnore: [...generalTestIgnore, /.*\.mobile\.spec\.ts/],
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "chromium-mobile",
      testIgnore: [...generalTestIgnore, /.*\.desktop\.spec\.ts/],
      use: {
        ...devices["Pixel 5"],
      },
    },
    {
      name: "firefox-desktop",
      testIgnore: [...generalTestIgnore, /.*\.mobile\.spec\.ts/],
      use: {
        ...devices["Desktop Firefox"],
      },
    },
    {
      name: "webkit-desktop",
      testIgnore: [...generalTestIgnore, /.*\.mobile\.spec\.ts/],
      use: {
        ...devices["Desktop Safari"],
      },
    },
  ],
});
