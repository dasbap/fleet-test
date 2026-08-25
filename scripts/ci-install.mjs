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
run("npm", ["ci", "--ignore-scripts", "--no-audit", "--no-fund"]);

// npm can omit platform-specific optional packages from an existing lock/tree,
// which leaves native modules such as sharp present without their Linux libvips
// runtime. Re-resolve optional dependencies for the current runner without
// mutating package-lock.json or running lifecycle scripts.
run("npm", [
  "install",
  "--include=optional",
  "--ignore-scripts",
  "--no-audit",
  "--no-fund",
  "--no-save",
  "--package-lock=false",
]);

run("npx", [
  "prisma",
  "generate",
  "--schema",
  "packages/db/prisma/schema.prisma",
]);
run("npx", ["patch-package"]);
