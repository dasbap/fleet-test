/**
 * Smoke test des pages marketing publiques (7 URLs).
 * Usage : serveur Vite déjà lancé → `npm run smoke:marketing`
 */
import { chromium } from "playwright";
import {
  getCandidatePorts,
  getSmokePaths,
  MARKETING_SMOKE_PATHS,
  waitForViteHttp,
} from "./lib/local-dev-open.mjs";

const STRICT = process.env.SMOKE_STRICT === "1";
const SLOW = process.env.SMOKE_NETWORK_SLOW === "1";
const DELAY_POST_GOTO = SLOW ? 2000 : 800;

function isIgnorableViteDepUrl(url) {
  return url.includes("/node_modules/.vite/deps/");
}

function isIgnorableRequestUrl(url) {
  if (isIgnorableViteDepUrl(url)) return true;
  if (url.includes("/audio/")) return true;
  if (url.includes("/rest/v1/help_articles")) return true;
  return false;
}

function isIgnorableConsoleMessage(text) {
  if (STRICT) return false;
  return (
    text.includes("Download the React DevTools") ||
    text.includes("[vite]") ||
    text.includes("posthog") ||
    text.includes("Erreur chargement articles aide")
  );
}

async function auditMarketingPage(page, base, path) {
  const consoleErrors = [];
  const failed = [];
  const badHttp = [];

  const onConsole = (msg) => {
    if (msg.type() === "error" && !isIgnorableConsoleMessage(msg.text())) {
      consoleErrors.push(msg.text());
    }
  };
  const onRequestFailed = (req) => {
    failed.push({ url: req.url(), error: req.failure()?.errorText });
  };
  const onResponse = (res) => {
    const status = res.status();
    if (status >= 400) {
      badHttp.push({ url: res.url(), status });
    }
  };

  page.on("console", onConsole);
  page.on("requestfailed", onRequestFailed);
  page.on("response", onResponse);

  const url = `${base}${path}`;
  const response = await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });

  await new Promise((r) => setTimeout(r, DELAY_POST_GOTO));

  page.off("console", onConsole);
  page.off("requestfailed", onRequestFailed);
  page.off("response", onResponse);

  const finalUrl = page.url();
  const failedCritical = failed.filter(
    (f) => STRICT || !isIgnorableRequestUrl(f.url),
  );
  const badCritical = badHttp.filter(
    (b) => STRICT || !isIgnorableRequestUrl(b.url),
  );

  return {
    path,
    responseStatus: response?.status() ?? 0,
    finalUrl,
    consoleErrors,
    failedCritical,
    badCritical,
  };
}

async function main() {
  const ports = getCandidatePorts();
  const port = await waitForViteHttp({
    ports,
    paths: getSmokePaths(),
    timeoutMs: 60_000,
  });

  if (port === null) {
    console.error("Aucun serveur détecté. Lancez `npm run dev` d'abord.");
    process.exit(1);
  }

  const base = `http://127.0.0.1:${port}`;
  console.log("Smoke marketing — base:", base);
  console.log("URLs:", MARKETING_SMOKE_PATHS.join(", "), "\n");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let exitCode = 0;

  for (const path of MARKETING_SMOKE_PATHS) {
    try {
      const result = await auditMarketingPage(page, base, path);

      if (path === "/tarifs" && !result.finalUrl.includes("/pricing")) {
        console.log(`✗ ${path} — redirect attendu vers /pricing, obtenu: ${result.finalUrl}`);
        exitCode = 1;
        continue;
      }

      const hasIssues =
        result.consoleErrors.length > 0 ||
        result.failedCritical.length > 0 ||
        result.badCritical.length > 0 ||
        result.responseStatus >= 400;

      if (hasIssues) {
        exitCode = 1;
        console.log(`✗ ${path}`);
        if (result.responseStatus >= 400) {
          console.log(`  HTTP ${result.responseStatus}`);
        }
        for (const err of result.consoleErrors) {
          console.log(`  console: ${err}`);
        }
        for (const f of result.failedCritical) {
          console.log(`  request failed: ${f.error} → ${f.url}`);
        }
        for (const b of result.badCritical) {
          console.log(`  HTTP ${b.status} → ${b.url}`);
        }
      } else {
        console.log(`✓ ${path}${path === "/tarifs" ? " → /pricing" : ""}`);
      }
    } catch (e) {
      exitCode = 1;
      console.log(`✗ ${path} — ${e instanceof Error ? e.message : e}`);
    }
  }

  await browser.close();
  process.exit(exitCode);
}

void main();
