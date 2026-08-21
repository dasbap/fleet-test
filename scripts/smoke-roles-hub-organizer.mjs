import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import process from "node:process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const DEFAULT_BASE = "http://127.0.0.1:8080";
const DEMO_EMAIL = "demo.organizer@esamba.test";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
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

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY;
const DEMO_PASSWORD = process.env.DEMO_PASSWORD?.trim() ?? "";
const base = process.env.E2E_BASE_URL?.trim() || DEFAULT_BASE;

if (DEMO_PASSWORD.length < 16) {
  throw new Error("DEMO_PASSWORD est requis et doit contenir au moins 16 caractères.");
}

function fail(msg) {
  console.error(`[FAIL] ${msg}`);
  process.exitCode = 1;
}

function ok(msg) {
  console.log(`[OK] ${msg}`);
}

async function apiSmoke() {
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    fail("VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants");
    return false;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
  const { data: auth, error: signErr } = await supabase.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  });

  if (signErr || !auth.session) {
    fail(`Connexion API : ${signErr?.message ?? "pas de session"}`);
    return false;
  }
  ok(`Connexion API organisateur (${DEMO_EMAIL})`);

  const { data: adhesions, error: adhErr } = await supabase
    .from("flotte_adhesions")
    .select("fleet_id, role")
    .eq("user_id", auth.user.id)
    .eq("is_active", true)
    .eq("role", "organizer")
    .limit(1);

  if (adhErr || !adhesions?.length) {
    fail(`Adhésion organizer introuvable : ${adhErr?.message ?? "vide"}`);
    return false;
  }

  const fleetId = adhesions[0].fleet_id;
  ok(`Flotte active : ${fleetId}`);

  const { data: members, error: memErr } = await supabase.rpc("get_fleet_members", {
    p_fleet_id: fleetId,
  });
  if (memErr) {
    fail(`RPC get_fleet_members : ${memErr.message}`);
    return false;
  }
  ok(`get_fleet_members : ${(members ?? []).length} membre(s)`);

  const { data: logs, error: logErr } = await supabase.rpc("get_fleet_audit_logs", {
    p_fleet_id: fleetId,
    p_limit: 10,
    p_actions: null,
  });
  if (logErr) {
    fail(`RPC get_fleet_audit_logs : ${logErr.message}`);
    return false;
  }
  ok(`get_fleet_audit_logs : ${(logs ?? []).length} entrée(s)`);

  const { data: invites, error: invErr } = await supabase.rpc("list_fleet_invitations", {
    p_fleet_id: fleetId,
  });
  if (invErr) {
    fail(`RPC list_fleet_invitations : ${invErr.message}`);
    return false;
  }
  ok(`list_fleet_invitations : ${(invites ?? []).length} code(s)`);

  const driver = (members ?? []).find((m) => m.role === "driver" && m.is_active && m.user_id !== auth.user.id);
  if (driver) {
    const { error: roleErr } = await supabase.rpc("update_fleet_member_role", {
      p_adhesion_id: driver.id,
      p_role: "driver",
    });
    if (roleErr) {
      fail(`RPC update_fleet_member_role (no-op) : ${roleErr.message}`);
      return false;
    }
    ok("update_fleet_member_role (même rôle, pas d'erreur)");
  } else {
    ok("update_fleet_member_role : ignoré (aucun conducteur cible)");
  }

  return { fleetId, session: auth.session };
}

async function uiSmoke() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];

  page.on("pageerror", (e) => errors.push(e.message));

  try {
    await page.goto(`${base}/auth`, { waitUntil: "networkidle", timeout: 90_000 });
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.waitFor({ state: "visible", timeout: 15_000 });
    await emailInput.fill(DEMO_EMAIL);
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill(DEMO_PASSWORD);
    await page.getByRole("button", { name: /connexion|se connecter|continuer/i }).first().click();
    await page.waitForURL(/\/dashboard/, { timeout: 45_000 });
    ok("UI : connexion organisateur réussie");

    await page.goto(`${base}/dashboard/roles`, { waitUntil: "networkidle", timeout: 60_000 });
    const pathname = new URL(page.url()).pathname;
    if (!pathname.includes("/dashboard/roles")) {
      fail(`UI : redirection inattendue vers ${page.url()}`);
      return false;
    }

    const title = await page.title();
    if (!/roles/i.test(title)) {
      fail(`UI : titre inattendu « ${title} »`);
      return false;
    }
    ok(`UI : route /dashboard/roles (titre « ${title} »)`);

    const tabCount = await page.getByRole("tab").count();
    if (tabCount >= 3) {
      for (const tab of ["Membres", "Permissions", "Historique", "Invitations"]) {
        const el = page.getByRole("tab", { name: new RegExp(tab, "i") });
        if ((await el.count()) === 0) continue;
        await el.first().click();
        await page.waitForTimeout(400);
        ok(`UI : onglet ${tab} accessible`);
      }
      ok("UI : hub rôles interactif (onglets visibles)");
    }

    if (errors.length) {
      fail(`UI erreurs runtime : ${errors.join(" | ")}`);
      return false;
    }

    return true;
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log("=== Smoke hub rôles (organisateur) ===\n");
  const apiResult = await apiSmoke();
  if (!apiResult) process.exit(process.exitCode ?? 1);
  const uiOk = await uiSmoke();
  if (!uiOk && process.exitCode !== 1) process.exitCode = 1;
  if (process.exitCode === 1) process.exit(1);
  console.log("\n=== Smoke hub rôles : succès ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
