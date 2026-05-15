/**
 * Après / puis /auth ou /login : vérifie l’absence de double requête identique pour les modules
 * d’écran auth, et optionnellement journalise toutes les URLs .tsx (proxy « onglet Réseau »).
 *
 * Prérequis : `npm run dev` ou `npm run dev:local` (un seul port actif recommandé).
 *
 * Variables :
 *   VERIFY_AUTH_PATH=/auth ou /login (défaut /auth)
 *   VERIFY_VERBOSE=1 — affiche toutes les URLs .tsx/.ts uniques après chaque navigation
 *   VERIFY_FORM_TIMEOUT_MS — attente chunk auth + UI (défaut 120000)
 *   VERIFY_NAV_TIMEOUT_MS — timeout navigation goto (défaut 120000)
 *   LOCAL_DEV_PORTS, E2E_PORTS — ports candidats (voir scripts/lib/local-dev-open.mjs)
 */
import { chromium } from "@playwright/test";
import {
  getCandidatePorts,
  getSmokePaths,
  waitForViteHttp,
} from "./lib/local-dev-open.mjs";

const target = (process.env.VERIFY_AUTH_PATH ?? "/auth").replace(/^\/?/, "/");
const verbose = process.env.VERIFY_VERBOSE === "1" || process.argv.includes("--verbose");

if (target !== "/auth" && target !== "/login") {
  console.error("VERIFY_AUTH_PATH doit être /auth ou /login");
  process.exit(1);
}

/** Champs réels : AuthPage (email + password), LoginPage (identifier sans type + password). */
const FORM_READY_SELECTOR =
  'input[type="password"], input[type="email"], input[autocomplete="username"]';

/**
 * True quand l’écran de connexion / inscription est visible (pas seulement le spinner RequireGuest).
 * Corps autonome : utilisé dans page.waitForFunction (pas de closure vers Node).
 */
function isAuthUiReady() {
  const text = document.body?.innerText ?? "";
  const hasHeading =
    /Connexion|Bon retour|Créer un compte|Flotte E-Samba|Mot de passe oublié|Nouveau mot de passe/i.test(
      text
    );
  const hasField = !!document.querySelector(
    'input[type="password"], input[type="email"], input[autocomplete="username"]'
  );
  return hasHeading || hasField;
}

/** Spinner RequireGuest / chargement auth. */
function isGuestGuardSpinnerVisible() {
  return !!document.querySelector(".animate-spin.rounded-full.border-primary");
}

function isAuthScreenModuleUrl(url) {
  const u = url.toLowerCase();
  if (!(u.includes("127.0.0.1") || u.includes("localhost"))) return false;
  if (u.includes("routes.tsx") || u.includes("routes.ts")) return false;
  return (
    u.includes("features/auth/screens") ||
    u.includes("authpage") ||
    u.includes("mobileloginscreen") ||
    u.includes("loginpage") ||
    u.includes("/pages/login")
  );
}

function collectTsxUrls(urls) {
  return urls.filter((u) => {
    const x = u.toLowerCase();
    return (
      (x.includes("127.0.0.1") || x.includes("localhost")) &&
      (x.includes(".tsx") || x.includes(".ts?"))
    );
  });
}

function printVerbose(label, allUrls) {
  if (!verbose) return;
  const tsx = [...new Set(collectTsxUrls(allUrls))].sort();
  console.log(`\n[verbose] ${label} — URLs .ts/.tsx (${tsx.length}) :`);
  for (const u of tsx) {
    console.log(" ", u);
  }
}

async function runScenario(base, targetPath) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  /** @type {string[]} */
  const authHits = [];
  /** @type {string[]} */
  const allUrls = [];

  page.on("request", (req) => {
    const u = req.url();
    allUrls.push(u);
    if (isAuthScreenModuleUrl(u)) authHits.push(u);
  });

  const navTimeout = parseInt(process.env.VERIFY_NAV_TIMEOUT_MS ?? "120000", 10);
  const formTimeout = parseInt(process.env.VERIFY_FORM_TIMEOUT_MS ?? "120000", 10);

  await page.goto(`${base}/`, { waitUntil: "domcontentloaded", timeout: navTimeout });
  await new Promise((r) => setTimeout(r, 1500));
  printVerbose("Après GET /", allUrls);

  const beforeAuthLen = allUrls.length;

  const authChunkPattern = (url) => {
    const u = url.toLowerCase();
    return (
      (u.includes("authpage") ||
        u.includes("loginpage") ||
        u.includes("auth/screens") ||
        u.includes("/pages/login")) &&
      (u.includes("127.0.0.1") || u.includes("localhost"))
    );
  };

  const chunkPromise = page
    .waitForResponse(
      (r) => authChunkPattern(r.url()) && r.status() === 200,
      { timeout: formTimeout }
    )
    .catch(() => null);

  await page.goto(`${base}${targetPath}`, { waitUntil: "domcontentloaded", timeout: navTimeout });
  const chunkReceived = await chunkPromise;

  if (!chunkReceived) {
    console.log(
      `[verify] Aucune réponse HTTP 200 pour un module auth dans ${formTimeout} ms — ` +
        "RequireGuest attend souvent Supabase (.env.local : VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)."
    );
  }

  await new Promise((r) => setTimeout(r, 800));

  const urlAfter = page.url();
  if (!urlAfter.includes(targetPath.split("?")[0])) {
    console.log(
      `[verify] Redirection après navigation : attendu ${targetPath}, URL actuelle : ${urlAfter}`
    );
    console.log(
      "  → Session peut-être déjà active (RequireGuest). Déconnectez-vous ou testez en navigation privée."
    );
  }

  try {
    await page.waitForFunction(() => isAuthUiReady(), { timeout: formTimeout });
  } catch {
    const stuck =
      await page.evaluate(() => isGuestGuardSpinnerVisible()).catch(() => false);
    if (stuck) {
      console.log(
        `[verify] Spinner de chargement toujours visible après ${formTimeout} ms — ` +
          "probable blocage Supabase / session (vérifiez .env.local : VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)."
      );
    } else {
      console.log(
        `[verify] Écran auth non détecté (${formTimeout} ms). ` +
          `Sélecteur champs : ${FORM_READY_SELECTOR}`
      );
    }
  }

  await new Promise((r) => setTimeout(r, 2500));
  printVerbose(`Après GET ${targetPath} (+ attente formulaire)`, allUrls.slice(beforeAuthLen));

  await browser.close();

  const unique = [...new Set(authHits)];
  console.log(`\n--- ${targetPath} — modules écran auth (URLs filtrées) ---`);
  console.log("Requêtes :", authHits.length, "| distinctes :", unique.length);
  for (const u of unique) {
    const n = authHits.filter((x) => x === u).length;
    console.log(n === 1 ? "  ✓" : "  ⚠ x" + n, u.slice(0, 160) + (u.length > 160 ? "…" : ""));
  }

  const duplicates = unique.filter((u) => authHits.filter((x) => x === u).length > 1);
  if (duplicates.length) {
    console.error("\nÉchec : au moins une URL module auth a été demandée plus d’une fois.");
    return false;
  }
  if (authHits.length === 0) {
    console.log(
      "\nAucune URL « features/auth/screens » / LoginPage détectée (noms Vite variables).",
      "Avec VERIFY_VERBOSE=1, contrôlez la liste .tsx ; manuellement : F12 → Réseau sur",
      targetPath
    );
  } else {
    console.log("\nOK : pas de double requête identique pour les modules d’écran auth détectés.");
  }
  return true;
}

async function main() {
  const port = await waitForViteHttp({
    ports: getCandidatePorts(),
    paths: getSmokePaths(),
    timeoutMs: 90_000,
  });
  if (port === null) {
    console.error("Aucun serveur Vite détecté. Lancez npm run dev ou npm run dev:local.");
    process.exit(1);
  }

  const base = `http://127.0.0.1:${port}`;
  console.log("Serveur :", base);
  console.log("Chemin  :", target);
  if (verbose) console.log("Mode    : verbose (journalisation .ts/.tsx)\n");

  const ok = await runScenario(base, target);
  process.exit(ok ? 0 : 1);
}

void main();
