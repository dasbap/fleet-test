/**
 * Audit réseau automatisé (Playwright) après stabilisation courte du pré-bundle Vite.
 * Usage : serveur Vite déjà lancé, puis `node scripts/dev-network-check.mjs`
 *
 * Variables :
 *   SMOKE_BROWSERS — `chromium` (défaut), liste `chromium,firefox,webkit`, ou `all`
 *   LOCAL_DEV_PORTS — ports candidats
 *   SMOKE_STRICT=1 — ne pas ignorer les erreurs sous `/.vite/deps/`
 *   SMOKE_NETWORK_SLOW=1 — délais plus longs (CI lent ou machine faible)
 *
 * Navigateurs : `npm run playwright:install:browsers` (Chromium, Firefox, WebKit).
 */
import { chromium, firefox, webkit } from "playwright";
import {
  getCandidatePorts,
  getSmokePaths,
  waitForViteHttp,
} from "./lib/local-dev-open.mjs";

const STRICT = process.env.SMOKE_STRICT === "1";
const SLOW = process.env.SMOKE_NETWORK_SLOW === "1";

const DELAY_PRE = SLOW ? 2200 : 900;
const DELAY_POST_GOTO = SLOW ? 2000 : 650;
const DELAY_POST_RELOAD = SLOW ? 6000 : 2800;

const BROWSER_MAP = { chromium, firefox, webkit };

function resolveBrowserNames() {
  const raw = (process.env.SMOKE_BROWSERS ?? "chromium").trim().toLowerCase();
  if (raw === "all") return ["chromium", "firefox", "webkit"];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((n) => n === "chromium" || n === "firefox" || n === "webkit");
}

function isIgnorableViteDepUrl(url) {
  return url.includes("/node_modules/.vite/deps/");
}

/**
 * @param {import('@playwright/test').BrowserType} browserType
 * @param {string} name
 * @param {string} base
 */
async function runAuditForBrowser(browserType, name, base) {
  const browser = await browserType.launch({ headless: true });
  const page = await browser.newPage();

  /** @type {{ url: string, error: string|undefined }[]} */
  const failed = [];
  /** @type {{ url: string, status: number }[]} */
  const badHttp = [];

  page.on("requestfailed", (req) => {
    failed.push({ url: req.url(), error: req.failure()?.errorText });
  });

  page.on("response", (res) => {
    const s = res.status();
    if (s >= 400) {
      badHttp.push({ url: res.url(), status: s });
    }
  });

  try {
    await page.goto(`${base}/`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await new Promise((r) => setTimeout(r, DELAY_POST_GOTO));
    await page.reload({ waitUntil: "domcontentloaded", timeout: 45_000 });
    await new Promise((r) => setTimeout(r, DELAY_POST_RELOAD));
  } catch (e) {
    console.error(`[${name}] Navigation :`, e instanceof Error ? e.message : e);
  }

  await browser.close();

  const failedCritical = failed.filter(
    (f) => STRICT || !isIgnorableViteDepUrl(f.url)
  );
  const badCritical = badHttp.filter(
    (b) => STRICT || !isIgnorableViteDepUrl(b.url)
  );

  return { name, failed, badHttp, failedCritical, badCritical };
}

async function main() {
  const ports = getCandidatePorts();
  const paths = getSmokePaths();
  const port = await waitForViteHttp({
    ports,
    paths,
    timeoutMs: 60_000,
  });

  if (port === null) {
    console.error(
      "Aucun serveur détecté. Lancez `npm run dev` ou `npm run dev:local`."
    );
    process.exit(1);
  }

  const base = `http://127.0.0.1:${port}`;
  const browserNames = resolveBrowserNames();
  console.log("URL testée :", base);
  console.log("Navigateurs :", browserNames.join(", "), SLOW ? "(mode lent)" : "", "\n");

  await new Promise((r) => setTimeout(r, DELAY_PRE));

  let exitCode = 0;

  const tasks = browserNames.map(async (name) => {
    const launcher = BROWSER_MAP[name];
    if (!launcher) return { name, skipped: true };
    try {
      const result = await runAuditForBrowser(launcher, name, base);
      return { name, skipped: false, result };
    } catch (e) {
      return {
        name,
        skipped: false,
        installHint: e instanceof Error ? e.message : String(e),
      };
    }
  });

  const outcomes = await Promise.all(tasks);

  for (const o of outcomes) {
    if (o.skipped) continue;
    if ("installHint" in o && o.installHint) {
      console.log(
        `[${o.name}] Ignoré — lancement impossible (${o.installHint}).`,
        "Exécutez : npm run playwright:install:browsers"
      );
      continue;
    }
    if (!("result" in o) || !o.result) continue;

    const { failedCritical, badCritical, failed, badHttp } = o.result;

    if (failedCritical.length === 0 && badCritical.length === 0) {
      console.log(`[${o.name}] OK — aucune requête critique en échec.`);
      if (!STRICT && (failed.length || badHttp.length)) {
        console.log(
          `  (Ignoré : ${failed.length + badHttp.length} entrée(s) liées au pré-bundle Vite — SMOKE_STRICT=1 pour tout remonter.)`
        );
      }
    } else {
      exitCode = 1;
      console.log(`[${o.name}] Échec — détails :`);
      if (failedCritical.length) {
        for (const f of failedCritical) {
          console.log(" ", f.error ?? "erreur", "→", f.url);
        }
      }
      if (badCritical.length) {
        for (const b of badCritical) {
          console.log(" ", b.status, b.url);
        }
      }
    }
  }

  process.exit(exitCode);
}

void main();
