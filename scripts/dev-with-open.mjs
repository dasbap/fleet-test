#!/usr/bin/env node
/**
 * Lance Vite sans ouverture automatique intégrée (`ESAMBA_MANAGED_OPEN=1` → `server.open: false` dans vite.config),
 * attend le port annoncé dans les logs + réponses HTTP critiques, puis ouvre une seule fois le navigateur.
 *
 * Évite d’ouvrir un ancien port (ex. 8083) alors que la nouvelle instance écoute sur 8085.
 *
 * Usage : `npm run dev:local`
 * Variables : LOCAL_DEV_PORTS, LOCAL_OPEN_WAIT_MS (défaut 120000), SMOKE_STRICT=1
 */
import { spawn } from "node:child_process";
import {
  REPO_ROOT,
  getCandidatePorts,
  getSmokePaths,
  openLocalhostLanding,
  waitForViteHttp,
} from "./lib/local-dev-open.mjs";

const timeoutMs = parseInt(process.env.LOCAL_OPEN_WAIT_MS ?? "120000", 10);

/** Extrait le port depuis la ligne « Local: http://localhost:PORT/ » de Vite. */
function extractPortFromViteLog(buffer) {
  const m = buffer.match(/Local:\s+https?:\/\/(?:127\.0\.0\.1|localhost):(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Attend que Vite annonce un port dans stdout et que les chemins smoke répondent sur ce port.
 * @param {import("node:child_process").ChildProcess} child
 */
async function waitForAdvertisedPortReady(child, paths, deadlineMs, shouldAbort) {
  let buf = "";
  let lastAnnounced = null;

  const onData = (chunk) => {
    const s = chunk.toString();
    process.stdout.write(s);
    buf = (buf + s).slice(-16000);
    const p = extractPortFromViteLog(buf);
    if (p !== null) lastAnnounced = p;
  };

  if (child.stdout) {
    child.stdout.on("data", onData);
  }

  const deadline = Date.now() + deadlineMs;
  while (Date.now() < deadline) {
    if (shouldAbort()) {
      return null;
    }
    if (lastAnnounced !== null) {
      const base = `http://127.0.0.1:${lastAnnounced}`;
      try {
        let ok = true;
        for (const pth of paths) {
          const res = await fetch(`${base}${pth}`, {
            signal: AbortSignal.timeout(8000),
          });
          if (!res.ok) {
            ok = false;
            break;
          }
        }
        if (ok) {
          return lastAnnounced;
        }
      } catch {
        /* pas encore prêt */
      }
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return null;
}

async function main() {
  const ports = getCandidatePorts();
  const paths = getSmokePaths();

  const child = spawn("npx", ["vite"], {
    cwd: REPO_ROOT,
    stdio: ["inherit", "pipe", "inherit"],
    shell: true,
    env: { ...process.env, ESAMBA_MANAGED_OPEN: "1" },
  });

  let opened = false;
  let childDead = false;

  child.on("error", (err) => {
    console.error("[dev:local] Impossible de lancer Vite :", err.message);
    process.exit(1);
  });

  child.on("exit", (code, signal) => {
    childDead = true;
    if (signal) {
      process.exit(1);
    }
    if (!opened) {
      console.error(
        "\n[dev:local] Vite s’est arrêté avant que le serveur HTTP soit utilisable (code",
        code ?? 0,
        ").\n"
      );
      process.exit(code === 0 ? 1 : (code ?? 1));
    }
    process.exit(code ?? 0);
  });

  const halfTimeout = Math.min(timeoutMs, Math.floor(timeoutMs / 2) + 15_000);
  let port = await waitForAdvertisedPortReady(child, paths, halfTimeout, () => childDead);

  if (port === null && !childDead) {
    port = await waitForViteHttp({
      ports,
      paths,
      timeoutMs: timeoutMs - halfTimeout,
      shouldAbort: () => childDead,
    });
  }

  if (childDead) {
    return;
  }

  if (port === null) {
    console.error(
      "\n[dev:local] Timeout : le serveur ne répond pas comme attendu sur les ports testés.",
      "Vérifiez les erreurs Vite ci-dessus.\n"
    );
    return;
  }

  opened = true;
  openLocalhostLanding(port);
  console.log(`\n[dev:local] Navigateur : http://localhost:${port}/\n`);
}

void main();
