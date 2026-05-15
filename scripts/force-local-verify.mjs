#!/usr/bin/env node
/**
 * Exécution forcée des vérifications locales : démarre Vite si aucun serveur
 * ne répond, puis smoke réseau + verify auth (/auth et /login).
 *
 * Usage : `npm run verify:local:force`
 * Variables : LOCAL_DEV_PORTS, VERIFY_FORM_TIMEOUT_MS, VERIFY_SKIP_AUTH=1 (ignore les échecs verify-auth)
 */
import { spawn } from "node:child_process";
import path from "node:path";
import {
  REPO_ROOT,
  getCandidatePorts,
  getSmokePaths,
  waitForViteHttp,
} from "./lib/local-dev-open.mjs";

function runNode(scriptRelative, env = {}) {
  const script = path.join(REPO_ROOT, scriptRelative);
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], {
      cwd: REPO_ROOT,
      stdio: "inherit",
      env: { ...process.env, ...env },
      shell: false,
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${scriptRelative} a quitté avec le code ${code}`));
    });
    child.on("error", reject);
  });
}

async function main() {
  process.env.VERIFY_FORM_TIMEOUT_MS =
    process.env.VERIFY_FORM_TIMEOUT_MS ?? "120000";
  process.env.VERIFY_NAV_TIMEOUT_MS =
    process.env.VERIFY_NAV_TIMEOUT_MS ?? "120000";

  const ports = getCandidatePorts();
  let port = await waitForViteHttp({
    ports,
    paths: getSmokePaths(),
    timeoutMs: 15_000,
  });

  /** @type {import('node:child_process').ChildProcess | null} */
  let vite = null;

  if (port === null) {
    console.log("[force] Aucun Vite détecté — démarrage de npx vite (ESAMBA_MANAGED_OPEN=1)…\n");
    vite = spawn("npx", ["vite"], {
      cwd: REPO_ROOT,
      stdio: "inherit",
      shell: true,
      env: { ...process.env, ESAMBA_MANAGED_OPEN: "1" },
    });
    port = await waitForViteHttp({
      ports,
      paths: getSmokePaths(),
      timeoutMs: 120_000,
      shouldAbort: () => vite != null && vite.exitCode != null,
    });
    if (port === null) {
      console.error("[force] Impossible de joindre Vite après démarrage.");
      if (vite && !vite.killed) vite.kill("SIGTERM");
      process.exit(1);
    }
    console.log("[force] Vite prêt sur le port", port, "\n");
  } else {
    console.log("[force] Vite déjà actif sur le port", port, "\n");
  }

  try {
    await runNode("scripts/dev-network-check.mjs");
    console.log("\n[force] dev-network-check : OK\n");
  } catch (e) {
    console.error("[force] dev-network-check :", e.message);
    if (vite && !vite.killed) vite.kill("SIGTERM");
    process.exit(1);
  }

  if (process.env.VERIFY_SKIP_AUTH === "1") {
    console.log("[force] VERIFY_SKIP_AUTH=1 — verify-auth-chunk ignoré (/auth et /login).\n");
  } else {
    for (const p of ["/auth", "/login"]) {
      try {
        await runNode("scripts/verify-auth-chunk.mjs", {
          VERIFY_AUTH_PATH: p,
          VERIFY_VERBOSE: process.env.VERIFY_VERBOSE ?? "",
        });
        console.log(`\n[force] verify-auth-chunk ${p} : OK\n`);
      } catch (e) {
        console.error(`[force] verify-auth-chunk ${p} :`, e.message);
        if (vite && !vite.killed) vite.kill("SIGTERM");
        process.exit(1);
      }
    }
  }

  if (vite && !vite.killed) {
    console.log("[force] Arrêt du processus Vite démarré par ce script.");
    vite.kill("SIGTERM");
  }
  console.log("[force] Terminé avec succès.");
}

void main().catch((err) => {
  console.error("[force]", err);
  process.exit(1);
});
