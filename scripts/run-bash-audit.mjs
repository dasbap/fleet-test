import { spawnSync } from "node:child_process";

const probe = spawnSync("bash", ["--version"], { stdio: "ignore", shell: true });

if (probe.status !== 0) {
  console.warn("bash indisponible sur cet environnement. Script Bash ignore (OK sous Windows).");
  process.exit(0);
}

const run = spawnSync("bash", ["scripts/audit-perf.sh"], { stdio: "inherit", shell: true });
process.exit(run.status ?? 1);
