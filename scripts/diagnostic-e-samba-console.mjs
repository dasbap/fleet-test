/**
 * Diagnostic headless : charge une ou plusieurs URLs (prod e-samba par défaut) et collecte
 * erreurs console, pageerror et requêtes réseau échouées (équivalent rapide à DevTools).
 *
 * Usage : npm run diagnostic:e-samba
 * Prérequis : npx playwright install chromium (une fois après npm install)
 *
 * URLs :
 *   - Par défaut : https://e-samba.com/ et https://www.e-samba.com/
 *   - E_SAMBA_DIAGNOSTIC_URL=https://www.e-samba.com/  (une seule URL)
 *   - E_SAMBA_DIAGNOSTIC_URLS=https://a.com/,https://b.com/  (virgules)
 *
 * Verbose (tous les types de messages console, pour debug uniquement) :
 *   --verbose | -v  ou  E_SAMBA_DIAGNOSTIC_VERBOSE=1
 *   Le code de sortie reste basé sur les erreurs (console error, pageerror, requêtes KO).
 */

import { chromium } from "playwright";

const DEFAULT_URLS = ["https://e-samba.com/", "https://www.e-samba.com/"];

function resolveTargetUrls() {
  const multi = process.env.E_SAMBA_DIAGNOSTIC_URLS?.trim();
  const single = process.env.E_SAMBA_DIAGNOSTIC_URL?.trim();
  if (multi) {
    const list = multi
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (list.length > 0) return list;
  }
  if (single) {
    return [single];
  }
  return [...DEFAULT_URLS];
}

function isVerbose() {
  if (process.argv.includes("--verbose") || process.argv.includes("-v")) {
    return true;
  }
  const v = process.env.E_SAMBA_DIAGNOSTIC_VERBOSE?.toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function classifyMessage(text) {
  const t = text.toLowerCase();
  if (t.includes("failed to fetch dynamically imported module") || t.includes("loading chunk"))
    return "chunk_module";
  if (t.includes("window is not defined")) return "window_ssr";
  if (t.includes("localstorage is not defined")) return "localstorage";
  if (t.includes("capacitor")) return "capacitor";
  if (t.includes("vite_supabase") || t.includes("variable d'environnement"))
    return "env";
  if (t.includes("fetch") || t.includes("network") || t.includes("cors"))
    return "fetch_api";
  return "other";
}

/**
 * @param {import('playwright').Page} page
 * @param {string} url
 * @param {{ verbose: boolean }} opts
 */
async function diagnoseUrl(page, url, opts) {
  const { verbose } = opts;
  const consoleErrors = [];
  /** @type {{ type: string; text: string }[]} */
  const consoleVerbose = [];
  const pageErrors = [];
  const failedRequests = [];

  page.on("console", (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (verbose) {
      consoleVerbose.push({ type, text });
    }
    if (type === "error") {
      consoleErrors.push({ type, text, category: classifyMessage(text) });
    }
  });

  page.on("pageerror", (err) => {
    pageErrors.push({ message: err.message, stack: err.stack ?? "" });
  });

  page.on("requestfailed", (request) => {
    failedRequests.push({
      url: request.url(),
      failure: request.failure()?.errorText ?? "unknown",
    });
  });

  const response = await page.goto(url, {
    waitUntil: "networkidle",
    timeout: 45_000,
  });

  await new Promise((r) => setTimeout(r, 2000));

  return {
    url,
    status: response?.status() ?? null,
    finalUrl: page.url(),
    consoleErrors,
    consoleVerbose: verbose ? consoleVerbose : [],
    pageErrors,
    failedRequests: failedRequests.filter((r) => {
      const u = r.url;
      if (
        u.includes("google-analytics") ||
        u.includes("analytics.google") ||
        u.includes("googletagmanager") ||
        u.includes("doubleclick.net") ||
        u.includes("region1.analytics.google")
      ) {
        return false;
      }
      return (
        u.includes(".js") ||
        u.includes("assets/") ||
        u.includes("supabase") ||
        r.failure !== "unknown"
      );
    }),
  };
}

async function main() {
  const urlsFromEnv = !!(
    process.env.E_SAMBA_DIAGNOSTIC_URLS?.trim() || process.env.E_SAMBA_DIAGNOSTIC_URL?.trim()
  );
  const urls = resolveTargetUrls();
  const verbose = isVerbose();

  console.log("Diagnostic console e-samba (Playwright Chromium)\n");
  console.log(
    urlsFromEnv ? `URLs cibles (env) : ${urls.join(", ")}` : `URLs cibles (défaut) : ${urls.join(", ")}`
  );
  if (verbose) {
    console.log("Mode verbose : tous les messages console seront listés (sortie toujours basée sur les erreurs).\n");
  } else {
    console.log("");
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: false,
  });

  const results = [];
  for (const url of urls) {
    const page = await context.newPage();
    console.log(`--- ${url} ---`);
    try {
      const r = await diagnoseUrl(page, url, { verbose });
      results.push(r);
      console.log(`Statut HTTP initial : ${r.status}`);
      console.log(`URL finale : ${r.finalUrl}`);
      if (verbose && r.consoleVerbose.length) {
        console.log("Tous les messages console (verbose) :");
        for (const m of r.consoleVerbose) {
          console.log(`  [${m.type}] ${m.text}`);
        }
      }
      if (r.consoleErrors.length) {
        console.log("Messages console (error) :");
        for (const m of r.consoleErrors) {
          console.log(`  [${m.category}] ${m.text}`);
        }
      } else {
        console.log("Aucun message console de type error capturé.");
      }
      if (r.pageErrors.length) {
        console.log("Page errors :");
        for (const e of r.pageErrors) {
          console.log(`  ${e.message}`);
        }
      }
      if (r.failedRequests.length) {
        console.log("Requêtes échouées (filtre assets / supabase) :");
        for (const f of r.failedRequests) {
          console.log(`  ${f.failure} — ${f.url}`);
        }
      } else {
        console.log("Aucune requête réseau échouée pertinente listée.");
      }
    } catch (e) {
      console.error(`Échec navigation : ${e instanceof Error ? e.message : e}`);
      results.push({ url, error: String(e) });
    } finally {
      await page.close();
    }
    console.log("");
  }

  await browser.close();

  const hasBlockingIssue = results.some(
    (r) =>
      r.pageErrors?.length ||
      r.consoleErrors?.length ||
      (r.failedRequests?.length ?? 0) > 0 ||
      r.error
  );

  console.log(
    hasBlockingIssue
      ? "Résumé : des erreurs ou échecs réseau ont été détectés — voir ci-dessus et docs/diagnostic-console-e-samba.md"
      : "Résumé : aucune erreur console/pageerror évidente sur cette exécution (le site peut encore afficher des avertissements non capturés)."
  );

  process.exit(hasBlockingIssue ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
