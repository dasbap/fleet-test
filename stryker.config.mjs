export default {
  testRunner: "vitest",
  plugins: ["@stryker-mutator/vitest-runner"],
  mutate: [
    "src/**/*.{ts,tsx}",
    "api/**/*.ts",
    "packages/**/*.{ts,tsx}",
    "!src/test/**",
    "!src/**/__tests__/**",
    "!src/**/*.test.{ts,tsx}",
    "!src/**/*.spec.{ts,tsx}",
    "!api/**/*.test.ts",
    "!api/**/*.spec.ts",
    "!packages/**/__tests__/**",
    "!packages/**/*.test.{ts,tsx}",
    "!packages/**/*.spec.{ts,tsx}",
    "!**/*.d.ts",
    "!**/generated/**",
    "!**/*.generated.{ts,tsx}",
    "!src/integrations/supabase/types.ts",
    "!src/main.tsx",
    "!src/vite-env.d.ts"
  ],
  vitest: {
    related: true
  },
  reporters: ["clear-text", "progress", "html", "json"],
  htmlReporter: {
    fileName: "reports/mutation/mutation.html"
  },
  jsonReporter: {
    fileName: "reports/mutation/mutation.json"
  },
  thresholds: {
    high: 80,
    low: 60,
    break: 50
  },
  timeoutMS: 15000,
  timeoutFactor: 1.5,
  concurrency: 2,
  incremental: true,
  incrementalFile: "reports/mutation/stryker-incremental.json",
  tempDirName: ".stryker-tmp",
  cleanTempDir: true,
  allowConsoleColors: true
};
