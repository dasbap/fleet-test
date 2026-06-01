import { defineConfig, devices } from '@playwright/test';

/**
 * Config Playwright isolée pour le wizard onboarding :
 * - port dédié (5174) pour ne pas heurter un `npm run dev` local
 * - auth mock explicite via variables d'environnement Vite
 * - scan Vite limité au front (voir vite.config.ts + ESAMBA_E2E=1)
 */
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5174';
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/onboarding-wizard.spec.ts',
  timeout: 90_000,
  workers: 1,
  retries: isCI ? 2 : 0,
  expect: {
    timeout: 45_000,
  },
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/e2e-onboarding-report.json' }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  webServer: {
    command:
      'cross-env ESAMBA_E2E=1 VITE_USE_MOCK_AUTH=true VITE_E2E_ONBOARDING=true VITE_MOCK_ORG_ID=11111111-1111-4111-8111-111111111111 VITE_SUPABASE_URL=https://placeholder-e2e.supabase.co VITE_SUPABASE_ANON_KEY=placeholder-anon-key-e2e-only npm run dev -- --host 127.0.0.1 --port 5174 --strictPort',
    url: BASE_URL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
