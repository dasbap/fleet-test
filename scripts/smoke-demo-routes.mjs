import { chromium } from "playwright";

const BASE_URL = process.env.E2E_BASE_URL?.trim() || "http://localhost:8080";
const PASSWORD = process.env.DEMO_PASSWORD?.trim() ?? "";

if (PASSWORD.length < 16) {
  throw new Error("DEMO_PASSWORD est requis et doit contenir au moins 16 caractères.");
}

const accounts = [
  { role: "Organizer", email: "demo.organizer@esamba.test" },
  { role: "Manager 1", email: "demo.manager1@esamba.test" },
  { role: "Manager 2", email: "demo.manager2@esamba.test" },
  { role: "Driver 1", email: "demo.driver1@esamba.test" },
  { role: "Driver 2", email: "demo.driver2@esamba.test" },
  { role: "Mechanic 1", email: "demo.mechanic1@esamba.test" },
];

const routes = [
  "/dashboard",
  "/dashboard/incidents",
  "/dashboard/vehicles",
  "/dashboard/teams",
  "/dashboard/invitations",
  "/dashboard/mobile/account",
  "/dashboard/mobile/fleet",
  "/dashboard/mobile/alerts",
  "/dashboard/mobile/operations",
];

async function login(page, email) {
  await page.goto(`${BASE_URL}/auth`, { waitUntil: "domcontentloaded" });
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForTimeout(1200);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const account of accounts) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const runtimeErrors = [];

    page.on("pageerror", (err) => {
      runtimeErrors.push(`pageerror: ${err.message}`);
    });
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        runtimeErrors.push(`console.error: ${msg.text()}`);
      }
    });

    try {
      await login(page, account.email);

      for (const route of routes) {
        await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(700);

        const bodyText = (await page.locator("body").innerText()).slice(0, 4000);
        const hasErrorBoundary = bodyText.includes("Une erreur est survenue");

        results.push({
          account: account.role,
          email: account.email,
          route,
          hasErrorBoundary,
          runtimeErrors: [...runtimeErrors],
        });

        runtimeErrors.length = 0;
      }
    } catch (error) {
      results.push({
        account: account.role,
        email: account.email,
        route: "__login_or_navigation__",
        hasErrorBoundary: true,
        runtimeErrors: [error instanceof Error ? error.message : String(error)],
      });
    } finally {
      await context.close();
    }
  }

  await browser.close();

  const failures = results.filter(
    (r) => r.hasErrorBoundary || (Array.isArray(r.runtimeErrors) && r.runtimeErrors.length > 0),
  );

  if (failures.length === 0) {
    console.log("SMOKE_OK: aucun crash runtime detecte sur les routes testees.");
    return;
  }

  console.log("SMOKE_FAIL:");
  for (const f of failures) {
    console.log(`- [${f.account}] ${f.route}`);
    for (const err of f.runtimeErrors) {
      console.log(`    ${err}`);
    }
  }
  process.exitCode = 1;
}

run();
