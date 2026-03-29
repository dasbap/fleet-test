/**
 * Diagnostic headless : charge e-samba.com (apex et www) et collecte
 * erreurs console, pageerror et requêtes réseau échouées (équivalent rapide à DevTools).
 * Usage : npm run diagnostic:e-samba
 * Prérequis : npx playwright install chromium (une fois après npm install)
 */

import { chromium } from "playwright";

const URLS = ["https://e-samba.com/", "https://www.e-samba.com/"];

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

async function diagnoseUrl(page, url) {
  const consoleMessages = [];
  const pageErrors = [];
  const failedRequests = [];

  page.on("console", (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (type === "error") {
      consoleMessages.push({ type, text, category: classifyMessage(text) });
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
    consoleErrors: consoleMessages,
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
  console.log("Diagnostic console e-samba (Playwright Chromium)\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: false,
  });

  const results = [];
  for (const url of URLS) {
    const page = await context.newPage();
    console.log(`--- ${url} ---`);
    try {
      const r = await diagnoseUrl(page, url);
      results.push(r);
      console.log(`Statut HTTP initial : ${r.status}`);
      console.log(`URL finale : ${r.finalUrl}`);
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
