export default {
  testRunner: "vitest",
  plugins: ["@stryker-mutator/vitest-runner"],
  mutate: [
    // BFF / securite / auth / webhooks / billing / GPS
    "src/server/**/*.{ts,tsx}",

    // Services metier avec effets et invariants importants
    "src/services/**/*.{ts,tsx}",

    // Logique metier partagee critique
    "src/lib/**/*billing*.{ts,tsx}",
    "src/lib/**/*payment*.{ts,tsx}",
    "src/lib/**/*subscription*.{ts,tsx}",
    "src/lib/**/*vehicle*.{ts,tsx}",
    "src/lib/**/*fleet*.{ts,tsx}",
    "src/lib/**/*auth*.{ts,tsx}",
    "src/lib/**/*security*.{ts,tsx}",
    "src/lib/**/*gps*.{ts,tsx}",
    "src/lib/**/*entitlement*.{ts,tsx}",

    // Fonctions API server-side encore actives
    "api/**/*.{ts,tsx}",

    // Packages uniquement lorsqu'ils portent de la logique metier critique
    "packages/**/*billing*.{ts,tsx}",
    "packages/**/*payment*.{ts,tsx}",
    "packages/**/*subscription*.{ts,tsx}",
    "packages/**/*vehicle*.{ts,tsx}",
    "packages/**/*auth*.{ts,tsx}",
    "packages/**/*security*.{ts,tsx}",
    "packages/**/*gps*.{ts,tsx}",

    // Exclusions tests / types / code genere
    "!src/test/**",
    "!src/**/__tests__/**",
    "!src/**/*.test.{ts,tsx}",
    "!src/**/*.spec.{ts,tsx}",
    "!api/**/*.test.{ts,tsx}",
    "!api/**/*.spec.{ts,tsx}",
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
  ignoreStatic: true,
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
