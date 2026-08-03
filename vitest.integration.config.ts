import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    pool: "forks",
    fileParallelism: false,
    include: [
      "tests/integration/fuel.fraud-scoring.test.ts",
      "tests/integration/rls.fleet-access.test.ts",
      "tests/integration/triggers.vehicle-limit.test.ts",
    ],
    reporters: ["default", "json"],
    outputFile: {
      json: "test-results/supabase-integration.json",
    },
    coverage: {
      enabled: false,
    },
  },
});
