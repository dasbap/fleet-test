/**
 * Utilitaires partagés : détection du port Vite local et ouverture du navigateur.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Racine du dépôt (scripts/lib → ../..) */
export const REPO_ROOT = path.join(__dirname, "..", "..");

/**
 * Ports candidats (ordre de préférence aligné sur vite.config + Playwright local).
 * Surcharge : `LOCAL_DEV_PORTS` ou (déprécié) `E2E_PORTS`, ex. `"8080,5173"`
 */
export function getCandidatePorts() {
  const raw =
    process.env.LOCAL_DEV_PORTS ??
    process.env.E2E_PORTS ??
    "8080,8081,8082,8083,8084,8085,8086,8087,8088,8089,8090,5173";
  return raw
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n) && n > 0 && n < 65536);
}

/**
 * @param {object} opts
 * @param {number[]} opts.ports
 * @param {string[]} opts.paths chemins relatifs à vérifier (GET 200)
 * @param {number} opts.timeoutMs
 * @param {() => boolean} [opts.shouldAbort] si vrai, arrêt immédiat (ex. processus Vite mort)
 * @returns {Promise<number|null>} port ou null si timeout / annulation
 */
export async function waitForViteHttp({ ports, paths, timeoutMs, shouldAbort }) {
  const deadline = Date.now() + timeoutMs;

  async function probePort(port) {
    const base = `http://127.0.0.1:${port}`;
    try {
      for (const p of paths) {
        const res = await fetch(`${base}${p}`, {
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) return null;
      }
      return port;
    } catch {
      return null;
    }
  }

  while (Date.now() < deadline) {
    if (shouldAbort?.()) {
      return null;
    }
    const hits = await Promise.all(ports.map((port) => probePort(port)));
    for (let i = 0; i < ports.length; i++) {
      if (hits[i] !== null) return ports[i];
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
}

/** Chemins minimaux pour considérer que le dev serveur sert correctement la SPA. */
export function getSmokePaths() {
  const strict = process.env.SMOKE_STRICT === "1";
  const base = ["/", "/src/main.tsx", "/locales/fr/common.json"];
  if (strict) {
    return [...base, "/favicon.svg"];
  }
  return base;
}

/** Pages marketing publiques à valider (smoke console + HTTP). */
export const MARKETING_SMOKE_PATHS = [
  "/",
  "/fonctionnalites",
  "/modules",
  "/pricing",
  "/faq",
  "/contact",
  "/tarifs",
];

/**
 * Ouvre l’URL dans le navigateur par défaut (Windows / macOS / Linux).
 * @param {string} url
 */
export function openDefaultBrowser(url) {
  const platform = process.platform;
  if (platform === "win32") {
    // Titre vide obligatoire pour `start` si l’URL pourrait être interprétée comme un titre.
    spawn("cmd", ["/c", "start", "", url], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    }).unref();
  } else if (platform === "darwin") {
    spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
  } else {
    spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
  }
}

/**
 * @param {number} port
 */
export function openLocalhostLanding(port) {
  openDefaultBrowser(`http://localhost:${port}/`);
}
