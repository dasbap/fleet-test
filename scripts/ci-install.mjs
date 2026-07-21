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

run("npm", ["config", "set", "fetch-timeout", "600000"]);
run("npm", ["config", "set", "fetch-retries", "5"]);
run("npm", ["ci", "--ignore-scripts", "--no-audit", "--no-fund"]);
run("npx", ["prisma", "generate", "--schema", "packages/db/prisma/schema.prisma"]);
run("npx", ["patch-package"]);
