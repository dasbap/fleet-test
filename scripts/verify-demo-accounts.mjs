#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const DEFAULT_BASE = "http://127.0.0.1:8080";

const DEMO_ACCOUNTS = [
  { role: "Organizer", email: "demo.organizer@esamba.test", expectedRole: "organizer", minAdhesions: 1 },
  { role: "Manager 1", email: "demo.manager1@esamba.test", expectedRole: "manager", minAdhesions: 1 },
  { role: "Manager 2", email: "demo.manager2@esamba.test", expectedRole: "manager", minAdhesions: 1 },
  { role: "Driver 1", email: "demo.driver1@esamba.test", expectedRole: "driver", minAdhesions: 1 },
  { role: "Driver 2", email: "demo.driver2@esamba.test", expectedRole: "driver", minAdhesions: 1 },
  { role: "Mechanic 1", email: "demo.mechanic1@esamba.test", expectedRole: "mechanic", minAdhesions: 1 },
];

function loadEnvLocal() {
  const path = join(root, ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    const val = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

function demoPassword() {
  const password = process.env.DEMO_PASSWORD?.trim() ?? "";
  if (password.length < 16) {
    throw new Error("DEMO_PASSWORD est requis et doit contenir au moins 16 caractères.");
  }
  return password;
}

function fail(msg) {
  console.error(`[FAIL] ${msg}`);
  process.exitCode = 1;
}

function ok(msg) {
  console.log(`[OK] ${msg}`);
}

async function verifyApiAccounts(password) {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    fail("VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants");
    return false;
  }

  let allOk = true;
  for (const acc of DEMO_ACCOUNTS) {
    const sb = createClient(url, anon);
    const { data, error } = await sb.auth.signInWithPassword({
      email: acc.email,
      password,
    });

    if (error || !data.session) {
      fail(`${acc.role} (${acc.email}) — connexion : ${error?.message ?? "pas de session"}`);
      allOk = false;
      continue;
    }

    const { data: adhs, error: adhErr } = await sb
      .from("flotte_adhesions")
      .select("fleet_id, role, is_active")
      .eq("user_id", data.user.id)
      .eq("is_active", true);

    if (adhErr || !adhs?.length) {
      fail(`${acc.role} — adhésion flotte : ${adhErr?.message ?? "aucune"}`);
      allOk = false;
      continue;
    }

    const roles = adhs.map((a) => a.role);
    if (!roles.includes(acc.expectedRole)) {
      fail(`${acc.role} — rôle attendu « ${acc.expectedRole} », obtenu : ${roles.join(", ")}`);
      allOk = false;
      continue;
    }

    if (adhs.length < acc.minAdhesions) {
      fail(`${acc.role} — ${adhs.length} adhésion(s), minimum ${acc.minAdhesions}`);
      allOk = false;
      continue;
    }

    ok(`${acc.role} — connexion + adhésion (${roles.join(", ")}, ${adhs.length} flotte(s))`);
  }

  return allOk;
}

function expectedPostLoginUrlPattern(expectedRole) {
  if (expectedRole === "driver") return /\/terrain/;
  if (expectedRole === "mechanic") return /\/dashboard\/maintenance/;
  return /\/dashboard/;
}

async function verifyUiLogin(password) {
  const { chromium } = await import("playwright");
  const base = process.env.E2E_BASE_URL?.trim() || DEFAULT_BASE;
  const browser = await chromium.launch({ headless: true });
  let allOk = true;

  for (const acc of DEMO_ACCOUNTS) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const pageErrors = [];

    page.on("pageerror", (err) => pageErrors.push(err.message));

    try {
      await page.goto(`${base}/auth`, { waitUntil: "networkidle", timeout: 90_000 });
      const emailInput = page.locator("#email, input[type='email']").first();
      await emailInput.waitFor({ state: "visible", timeout: 20_000 });
      await emailInput.fill(acc.email);
      const passwordInput = page.locator("#password, input[type='password']").first();
      await passwordInput.fill(password);
      await page.locator('form button[type="submit"]').first().click();
      const urlPattern = expectedPostLoginUrlPattern(acc.expectedRole);
      await page.waitForURL(urlPattern, { timeout: 45_000 });

      if (page.url().includes("/start")) {
        fail(`${acc.role} — redirection tenant bootstrap (/start) au lieu de l'espace métier`);
        allOk = false;
        continue;
      }

      const bodyText = (await page.locator("body").innerText()).slice(0, 4000);
      if (bodyText.includes("Une erreur est survenue")) {
        fail(`${acc.role} — boundary React après connexion`);
        allOk = false;
      } else if (pageErrors.length) {
        fail(`${acc.role} — erreur runtime : ${pageErrors.join(" | ")}`);
        allOk = false;
      } else {
        ok(`${acc.role} — UI connexion → espace métier (${page.url()})`);
      }
    } catch (e) {
      fail(`${acc.role} — UI : ${e instanceof Error ? e.message : String(e)}`);
      allOk = false;
    } finally {
      await context.close();
    }
  }

  await browser.close();
  return allOk;
}

async function main() {
  const password = demoPassword();
  const withUi = process.argv.includes("--ui");
  console.log("=== Vérification comptes démo E-Samba ===\n");

  console.log("--- API Supabase ---");
  const apiOk = await verifyApiAccounts(password);
  if (!apiOk) {
    console.log("\n=== Échec API ===");
    process.exit(1);
  }

  if (withUi) {
    console.log("\n--- UI Playwright ---");
    const uiOk = await verifyUiLogin(password);
    if (!uiOk) {
      console.log("\n=== Échec UI ===");
      process.exit(1);
    }
  }

  console.log("\n=== Tous les comptes démo sont opérationnels ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
