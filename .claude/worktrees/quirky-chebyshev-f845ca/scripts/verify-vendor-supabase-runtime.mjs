/**
 * Vérification runtime (passe 2E) : trace réseau ciblée pour confirmer que le chunk
 * vendor-supabase n'est pas demandé sur la landing froide (/), et l'est bien sur
 * une route sous AuthProviderLayout (/auth ou /dashboard).
 *
 * Prérequis : `npm run build`, puis ce script lance `vite preview` localement.
 * Une fois : `npx playwright install chromium`
 *
 * Usage : node scripts/verify-vendor-supabase-runtime.mjs
 */

import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { chromium } from "playwright";
import process from "node:process";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Évite les collisions avec un vieux `vite preview` encore à l’écoute. */
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

const SUPABASE_CHUNK_PATTERN = /vendor-supabase[^/]*\.js/i;

function collectJsUrls(page) {
  const urls = [];
  const onResponse = (response) => {
    const u = response.url();
    if (u.includes(".js") && (u.includes("/assets/") || u.endsWith(".js"))) {
      urls.push(u);
    }
  };
  page.on("response", onResponse);
  return () => {
    page.off("response", onResponse);
    return urls;
  };
}

function hasVendorSupabaseChunk(urls) {
  return urls.some((u) => SUPABASE_CHUNK_PATTERN.test(u));
}

async function waitForPreviewReady(baseUrl, previewState, maxMs = 90_000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (previewState.exited && previewState.code !== 0) {
      throw new Error(
        `vite preview s'est arrêté avant d'être prêt (code ${previewState.code}). Vérifiez le build et les logs ci-dessus.`,
      );
    }
    try {
      const res = await fetch(`${baseUrl}/`);
      if (res.ok || res.status === 404) return;
    } catch {
      /* serveur pas prêt */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Timeout: preview indisponible sur ${baseUrl}`);
}

async function coldNavigateCollectJs(page, baseUrl, path) {
  const detach = collectJsUrls(page);
  await page.goto(`${baseUrl}${path}`, {
    waitUntil: "load",
    timeout: 60_000,
  });
  // Laisser le temps aux dynamic import() et au preload idle (2C)
  await new Promise((r) => setTimeout(r, 2500));
  const urls = detach();
  return urls;
}

async function main() {
  const envPort = process.env.VERIFY_PREVIEW_PORT;
  const previewPort = envPort ? Number.parseInt(envPort, 10) : await getFreePort();
  if (envPort && (Number.isNaN(previewPort) || previewPort < 1 || previewPort > 65535)) {
    console.error("VERIFY_PREVIEW_PORT doit être un entier entre 1 et 65535.");
    process.exit(1);
  }
  const base = `http://127.0.0.1:${previewPort}`;

  const preview = spawn("npm", ["run", "preview", "--", "--host", "127.0.0.1", "--port", String(previewPort), "--strictPort"], {
    cwd: projectRoot,
    stdio: "inherit",
    shell: true,
  });

  const previewState = { exited: false, code: null };
  preview.on("exit", (code) => {
    previewState.exited = true;
    previewState.code = code;
  });

  let exitCode = 0;

  try {
    await waitForPreviewReady(base, previewState);

    const browser = await chromium.launch({ headless: true });

    // --- Landing froide : contexte neuf, pas de cookies ---
    const ctxLanding = await browser.newContext();
    const pageLanding = await ctxLanding.newPage();
    const landingJs = await coldNavigateCollectJs(pageLanding, base, "/");
    await ctxLanding.close();

    if (hasVendorSupabaseChunk(landingJs)) {
      console.error("ECHEC 2E : vendor-supabase a été chargé sur GET / (landing froide).");
      console.error(
        "URLs JS concernées :",
        landingJs.filter((u) => SUPABASE_CHUNK_PATTERN.test(u)),
      );
      exitCode = 1;
    } else {
      console.log("OK 2E : aucun chunk vendor-supabase sur / (landing froide).");
    }

    // --- Route sous AuthProvider : doit charger Supabase ---
    const ctxAuth = await browser.newContext();
    const pageAuth = await ctxAuth.newPage();
    const authJs = await coldNavigateCollectJs(pageAuth, base, "/auth");
    await ctxAuth.close();

    if (!hasVendorSupabaseChunk(authJs)) {
      console.error(
        "ECHEC 2E : vendor-supabase attendu sur /auth (AuthProvider) mais non observé dans les réponses.",
      );
      console.error("Extrait URLs JS (max 15) :", authJs.slice(0, 15));
      exitCode = 1;
    } else {
      console.log("OK 2E : chunk vendor-supabase observé sur /auth (comportement attendu).");
    }

    // --- Optionnel : /dashboard (même layout auth) ---
    const ctxDash = await browser.newContext();
    const pageDash = await ctxDash.newPage();
    const dashJs = await coldNavigateCollectJs(pageDash, base, "/dashboard");
    await ctxDash.close();

    if (!hasVendorSupabaseChunk(dashJs)) {
      console.warn(
        "AVERTISSEMENT 2E : vendor-supabase non détecté sur /dashboard (redirection rapide possible). Vérifier manuellement si besoin.",
      );
    } else {
      console.log("OK 2E : chunk vendor-supabase observé sur /dashboard.");
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
