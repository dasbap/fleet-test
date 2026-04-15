/**
 * Smoke test : sert dist/ via vite preview et vérifie que la SPA monte sans erreur fatale.
 * Simule un chargement navigateur (proche WebView Chromium) sans device natif.
 *
 * Prérequis : dist/ à jour (ex. `npm run build:capacitor`), Playwright Chromium installé.
 */
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import { chromium } from "playwright";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function getFreePort() {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.listen(0, "127.0.0.1", () => {
      const addr = s.address();
      const port = typeof addr === "object" && addr ? addr.port : null;
      s.close(() => (port ? resolve(port) : reject(new Error("Port libre introuvable"))));
    });
    s.on("error", reject);
  });
}

async function waitForPreviewReady(baseUrl, previewState, maxMs = 90_000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (previewState.exited && previewState.code !== 0) {
      throw new Error(
        `vite preview arrêté (code ${previewState.code}). Vérifiez dist/ et les logs.`,
      );
    }
    try {
      const res = await fetch(`${baseUrl}/`);
      if (res.ok) return;
    } catch {
      /* serveur pas prêt */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Timeout: preview indisponible sur ${baseUrl}`);
}

async function main() {
  const previewPort = await getFreePort();
  const base = `http://127.0.0.1:${previewPort}`;

  const preview = spawn(
    "npm",
    ["run", "preview", "--", "--host", "127.0.0.1", "--port", String(previewPort), "--strictPort"],
    {
      cwd: projectRoot,
      stdio: "inherit",
      shell: true,
    },
  );

  const previewState = { exited: false, code: null };
  preview.on("exit", (code) => {
    previewState.exited = true;
    previewState.code = code;
  });

  let exitCode = 0;

  try {
    await waitForPreviewReady(base, previewState);

    const offlineRes = await fetch(`${base}/offline.html`);
    if (!offlineRes.ok) {
      console.error(`[smoke-spa] offline.html : statut ${offlineRes.status}`);
      exitCode = 1;
    } else {
      const offlineText = await offlineRes.text();
      if (!offlineText.includes("Connexion indisponible")) {
        console.error("[smoke-spa] offline.html : texte « Connexion indisponible » introuvable.");
        exitCode = 1;
      } else {
        console.info("[smoke-spa] OK — /offline.html servi (fallback PWA).");
      }
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(String(err)));

    await page.goto(`${base}/`, { waitUntil: "load", timeout: 60_000 });

    const root = await page.locator("#root");
    await root.waitFor({ state: "attached", timeout: 15_000 });

    // Bootstrap async : Suspense + import() dynamiques (App, instrument)
    await new Promise((r) => setTimeout(r, 2000));

    const childCount = await page.evaluate(() => document.getElementById("root")?.children.length ?? 0);
    if (childCount === 0 && pageErrors.length === 0) {
      console.warn(
        "[smoke-spa] AVERTISSEMENT : #root encore vide après attente — possible lenteur réseau ou erreur silencieuse.",
      );
    }

    if (pageErrors.length > 0) {
      console.error("[smoke-spa] Erreurs page :", pageErrors);
      exitCode = 1;
    } else {
      console.info("[smoke-spa] OK — / chargé, #root présent, pas d’exception page.");
    }

    await browser.close();
  } catch (e) {
    console.error(e);
    exitCode = 1;
  } finally {
    try {
      preview.kill("SIGTERM");
    } catch {
      /* ignore */
    }
  }

  process.exit(exitCode);
}

main();
