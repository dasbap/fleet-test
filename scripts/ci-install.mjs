#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const run = (command, args) => {
  console.log(`==> ${command} ${args.join(" ")}`);
  execFileSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      NODE_OPTIONS: process.env.NODE_OPTIONS || "--max-old-space-size=2048",
      PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1",
    },
  });
};

run("npm", ["config", "set", "fetch-retries", "5"]);

// Keep CI strictly locked to package-lock.json while explicitly materializing
// platform-specific optional packages (notably sharp/libvips on Linux).
// A second `npm install` here would re-resolve semver ranges and make the CI
// bundle differ from a clean local `npm ci` build.
run("npm", [
  "ci",
  "--include=optional",
  "--ignore-scripts",
  "--no-audit",
  "--no-fund",
]);

if (process.platform === "linux" && process.arch === "x64") {
  run("node", [
    "-e",
    "require('./node_modules/vite-imagetools/node_modules/sharp'); console.log('vite-imagetools sharp linux runtime OK')",
  ]);
}

run("npx", [
  "prisma",
  "generate",
  "--schema",
  "packages/db/prisma/schema.prisma",
]);
run("npx", ["patch-package"]);
