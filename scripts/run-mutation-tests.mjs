import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const STRYKER_VERSION = "10.0.0";
const runtimeDir = resolve(".stryker-runtime");
const runtimeBin = join(runtimeDir, "node_modules", ".bin");
const strykerExecutable = join(
  runtimeBin,
  process.platform === "win32" ? "stryker.cmd" : "stryker",
);

function run(command, args, options = {}) {
  if (process.platform === "win32" && command.endsWith(".cmd")) {
    return spawnSync(
      process.env.ComSpec || "cmd.exe",
      ["/d", "/s", "/c", command, ...args],
      {
        stdio: "inherit",
        env: process.env,
        ...options,
      },
    );
  }

  return spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
    ...options,
  });
}

if (!existsSync(strykerExecutable)) {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const installArgs = [
    "install",
    "--prefix",
    runtimeDir,
    "--no-save",
    "--no-package-lock",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    `@stryker-mutator/core@${STRYKER_VERSION}`,
    `@stryker-mutator/vitest-runner@${STRYKER_VERSION}`,
    "typescript",
  ];

  const install = run(npmCommand, installArgs);
  if (install.error || install.status !== 0) {
    console.error(
      "Impossible de préparer le runtime des tests de mutation:",
      install.error ?? `code ${install.status}`,
    );
    process.exit(install.status ?? 1);
  }
}

const result = run(strykerExecutable, [
  "run",
  "stryker.config.mjs",
  ...process.argv.slice(2),
]);

if (result.error) {
  console.error("Impossible de lancer les tests de mutation:", result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
