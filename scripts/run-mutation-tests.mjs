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

let result;

if (process.platform === "win32") {
  result = spawnSync("cmd.exe", ["/d", "/s", "/c", "npx", ...args], {
    stdio: "inherit",
    env: process.env,
  });
} else {
  result = spawnSync("npx", args, {
    stdio: "inherit",
    env: process.env,
  });
}

if (result.error) {
  console.error("Impossible de lancer les tests de mutation:", result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
