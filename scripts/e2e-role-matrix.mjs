/**
 * Matrice E2E : rôles × routes protégées (RoleGuard), sans intervention manuelle.
 *
 * Prérequis :
 * - Une fois : npx playwright install chromium
 * - Serveur Vite avec auth mock : VITE_USE_MOCK_AUTH=true (ex. .env.local ou ligne de commande)
 *   puis npm run dev — URL par défaut http://127.0.0.1:5173
 * Usage :
 *   E2E_BASE_URL=http://127.0.0.1:5173 node scripts/e2e-role-matrix.mjs
 *
 * Sans VITE_USE_MOCK_AUTH=true, la session injectée est ignorée (AuthProvider Supabase) : échec (redirection /auth).
 *
 * Référence métier : src/auth/permissions.ts (MODULE_ACCESS), dashboard.routes.tsx (RoleGuard).
 */
import { chromium } from "playwright";
import process from "node:process";

const DEFAULT_BASE = "http://127.0.0.1:5173";
/** Aligné sur src/mocks/demo/constants.ts (fleet démo mock). */
const DEMO_FLEET_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
const MOCK_AUTH_EVENT = "esamba-mock-auth-changed";

/** Rôles AppRole (email pour cohérence avec la démo ; la session est injectée en localStorage). */
const ROLE_ACCOUNTS = [
  { appRole: "organizer", email: "demo.organizer@esamba.test" },
  { appRole: "manager", email: "demo.manager1@esamba.test" },
  { appRole: "driver", email: "demo.driver1@esamba.test" },
  { appRole: "mechanic", email: "demo.mechanic1@esamba.test" },
];

/**
 * Routes avec RoleGuard : pour chaque entrée, liste des appRole autorisés.
 * Doit rester aligné avec dashboard.routes.tsx + MODULE_ACCESS.
 */
const GUARDED_ROUTES = [
  { path: "/dashboard/finances", allowed: ["organizer"] },
  { path: "/dashboard/collections", allowed: ["organizer", "manager"] },
  { path: "/dashboard/drivers", allowed: ["organizer", "manager"] },
  { path: "/dashboard/teams", allowed: ["organizer", "manager"] },
  { path: "/dashboard/analytics/retention", allowed: ["organizer"] },
  { path: "/dashboard/roles", allowed: ["organizer", "manager"] },
  { path: "/dashboard/history", allowed: ["organizer", "manager", "mechanic"] },
  { path: "/dashboard/operations", allowed: ["organizer", "manager", "driver", "mechanic"] },
  {
    path: "/dashboard/operations/mission/e2e-smoke-mission",
    allowed: ["organizer", "manager", "driver"],
  },
  {
    path: "/dashboard/operations/intervention/e2e-smoke-ticket",
    allowed: ["organizer", "manager", "mechanic"],
  },
];

/** Routes sans RoleGuard : tout utilisateur connecté doit rester sur l’URL (smoke charge page). */
const UNGUARDED_ROUTES = [
  "/dashboard",
  "/dashboard/incidents",
  "/dashboard/vehicles",
  "/dashboard/settings",
];

function parseArgs() {
  const base = process.env.E2E_BASE_URL?.trim() || DEFAULT_BASE;
  return { base };
}

/**
 * Session mock identique à MockPersistedSession / mock-auth.service (sans formulaire).
 */
function buildMockPersistedJson(appRole, email) {
  const userId = `e2e-${appRole}`;
  return JSON.stringify({
    user: {
      id: userId,
      email,
      created_at: new Date().toISOString(),
      user_metadata: { full_name: `E2E ${appRole}` },
    },
    role: appRole,
    memberships: [
      {
        id: `mock-memb-${userId}`,
        fleet_id: DEMO_FLEET_ID,
        role: appRole,
        is_active: true,
      },
    ],
  });
}

/**
 * @param {import('playwright').Page} page
 * @param {{ base: string }} cfg
 * @param {{ appRole: string, email: string }} account
 */
async function bootstrapMockSession(page, cfg, account) {
  await page.goto(`${cfg.base}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });

  const payload = buildMockPersistedJson(account.appRole, account.email);
  await page.evaluate(
    ({ storage, eventName }) => {
      globalThis.localStorage?.setItem("esamba-mock-auth-v1", storage);
      globalThis.dispatchEvent(new CustomEvent(eventName));
    },
    { storage: payload, eventName: MOCK_AUTH_EVENT },
  );

  await page.goto(`${cfg.base}/dashboard`, { waitUntil: "domcontentloaded", timeout: 60_000 });

  await page.waitForURL(
    (u) => {
      try {
        const p = new URL(u).pathname.replace(/\/$/, "") || "/";
        return p === "/dashboard";
      } catch {
        return false;
      }
    },
    { timeout: 15_000 },
  );
}

/**
 * @param {string} pathname
 * @param {string} expectedPath
 */
function pathMatchesRoute(pathname, expectedPath) {
  if (pathname === expectedPath) return true;
  if (expectedPath !== "/dashboard" && pathname.startsWith(`${expectedPath}/`)) return true;
  return false;
}

async function main() {
  const cfg = parseArgs();
  const failures = [];

  const browser = await chromium.launch({ headless: true });

  for (const account of ROLE_ACCOUNTS) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const runtimeErrors = [];

    page.on("pageerror", (err) => runtimeErrors.push(`pageerror: ${err.message}`));
    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      const t = msg.text();
      // Requêtes Supabase avec fleet_id démo non-UUID : bruit attendu en session mock + API réelle.
      if (t.includes("f47ac10b-58cc-4372-a567-0e02b2c3d479") || t.includes("22P02")) return;
      runtimeErrors.push(`console: ${t}`);
    });

    try {
      await bootstrapMockSession(page, cfg, account);

      for (const route of GUARDED_ROUTES) {
        const allowed = route.allowed.includes(account.appRole);
        const normalizedPath = route.path.replace(/\/$/, "") || "/";

        await page.goto(`${cfg.base}${route.path}`, {
          waitUntil: "domcontentloaded",
          timeout: 45_000,
        });

        try {
          if (allowed) {
            await page.waitForURL(
              (u) => {
                try {
                  const p = new URL(u).pathname.replace(/\/$/, "") || "/";
                  return pathMatchesRoute(p, normalizedPath);
                } catch {
                  return false;
                }
              },
              { timeout: 12_000 },
            );
          } else {
            await page.waitForURL(
              (u) => {
                try {
                  const p = new URL(u).pathname.replace(/\/$/, "") || "/";
                  return p === "/dashboard";
                } catch {
                  return false;
                }
              },
              { timeout: 12_000 },
            );
          }
        } catch {
          /* évaluation ci-dessous avec url courante */
        }

        const url = page.url();
        const pathname = new URL(url).pathname.replace(/\/$/, "") || "/";

        let ok = false;
        if (allowed) {
          ok = pathMatchesRoute(pathname, normalizedPath);
        } else {
          ok = pathname === "/dashboard";
        }

        const bodyText = (await page.locator("body").innerText()).slice(0, 2000);
        const errorBoundary = bodyText.includes("Une erreur est survenue");

        if (!ok || errorBoundary || runtimeErrors.length > 0) {
          failures.push({
            role: account.appRole,
            route: route.path,
            expected: allowed ? "accès autorisé (URL correspond)" : "redirection /dashboard",
            gotUrl: url,
            errorBoundary,
            runtimeErrors: [...runtimeErrors],
          });
          runtimeErrors.length = 0;
        } else {
          runtimeErrors.length = 0;
        }
      }

      for (const path of UNGUARDED_ROUTES) {
        await page.goto(`${cfg.base}${path}`, {
          waitUntil: "domcontentloaded",
          timeout: 45_000,
        });
        await page.waitForTimeout(400);
        const pathname = new URL(page.url()).pathname.replace(/\/$/, "") || "/";
        const normalized = path.replace(/\/$/, "") || "/";
        const bodyText = (await page.locator("body").innerText()).slice(0, 2000);
        const errorBoundary = bodyText.includes("Une erreur est survenue");

        if (pathname !== normalized || errorBoundary || runtimeErrors.length > 0) {
          failures.push({
            role: account.appRole,
            route: path,
            expected: "page accessible (sans RoleGuard)",
            gotUrl: page.url(),
            errorBoundary,
            runtimeErrors: [...runtimeErrors],
          });
        }
        runtimeErrors.length = 0;
      }
    } catch (e) {
      failures.push({
        role: account.appRole,
        route: "__login__",
        expected: "connexion réussie",
        gotUrl: page.url(),
        errorBoundary: false,
        runtimeErrors: [e instanceof Error ? e.message : String(e)],
      });
    } finally {
      await context.close();
    }
  }

  await browser.close();

  if (failures.length === 0) {
    console.log(
      `E2E_ROLE_MATRIX_OK — ${ROLE_ACCOUNTS.length} rôles, ${GUARDED_ROUTES.length} routes gardées, ${UNGUARDED_ROUTES.length} routes ouvertes (${cfg.base}).`,
    );
    process.exitCode = 0;
    return;
  }

  console.error("E2E_ROLE_MATRIX_FAIL");
  for (const f of failures) {
    console.error(`- [${f.role}] ${f.route} — attendu: ${f.expected}`);
    console.error(`  URL: ${f.gotUrl}`);
    if (f.errorBoundary) console.error("  boundary erreur React détecté");
    for (const err of f.runtimeErrors) console.error(`  ${err}`);
  }
  process.exitCode = 1;
}

main();
