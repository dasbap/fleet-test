import { spawnSync } from "node:child_process";

const STRYKER_VERSION = "10.0.0";

const args = [
  "-y",
  `--package=@stryker-mutator/core@${STRYKER_VERSION}`,
  `--package=@stryker-mutator/vitest-runner@${STRYKER_VERSION}`,
  "stryker",
  "run",
  "stryker.config.mjs",
  ...process.argv.slice(2),
];

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(command, args, {
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  console.error("Impossible de lancer les tests de mutation:", result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
