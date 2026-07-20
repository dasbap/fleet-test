/**
 * Parcours E2E « golden path » contre Supabase réel (auth + RLS métier).
 *
 * Prérequis (.env.local) :
 *   RUN_E2E_LIVE=1
 *   E2E_LIVE_EMAIL / E2E_LIVE_PASSWORD (ou PLAYWRIGHT_TEST_* / TEST_INTEGRATION_*)
 *   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY (nettoyage après test)
 *
 * Compte test : organizer ou manager avec adhésion flotte active.
 * VITE_USE_MOCK_AUTH ne doit pas être "true".
 *
 * Lancement :
 *   npm run test:e2e:live
 */

import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import {
  canRunLiveE2E,
  getLiveE2ECredentials,
  liveE2ESkipReason,
} from "./helpers/live-supabase-env";
import {
  establishLiveSupabaseSession,
  loginViaAuthForm,
} from "./helpers/live-auth";
import { selectRadixOption } from "./helpers/radix-ui";

const RUN_ID = Date.now().toString(36).toUpperCase();
const REGISTRATION = `E2E-${RUN_ID}`;
const INCIDENT_MARKER = `Incident E2E automatisé ${RUN_ID}`;
const canRunLiveSuite = canRunLiveE2E();
if (!canRunLiveSuite) {
  console.warn(`[tests/e2e] Suite ignoree: ${liveE2ESkipReason()}`);
}
test.skip(!canRunLiveSuite, liveE2ESkipReason());

test.describe("Parcours golden path — Supabase live", () => {
  test.describe.configure({ mode: "serial" });
  test.slow();
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.removeItem("esamba-demo-auth-fallback");
      window.localStorage.removeItem("esamba-mock-auth-v1");
    });
  });

  test.afterAll(async () => {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    const url = process.env.VITE_SUPABASE_URL?.trim();
    if (!serviceKey || !url) return;

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: vehicle } = await admin
      .from("vehicules")
      .select("id")
      .eq("registration", REGISTRATION)
      .maybeSingle();

    if (!vehicle?.id) return;

    await admin.from("incidents").delete().eq("vehicle_id", vehicle.id);
    await admin
      .from("travaux_maintenance")
      .delete()
      .eq("vehicle_id", vehicle.id);
    await admin.from("vehicules").delete().eq("id", vehicle.id);
  });

  test("auth → véhicule → maintenance → incident (RLS)", async ({ page }) => {
    test.skip(!canRunLiveSuite, liveE2ESkipReason());

    const credentials = getLiveE2ECredentials();
    expect(credentials).not.toBeNull();

    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (
        msg.type() === "error" &&
        /PGRST116|row-level security/i.test(msg.text())
      ) {
        consoleErrors.push(msg.text());
      }
    });

    await test.step("Authentification — session et redirection dashboard", async () => {
      const useUiLogin =
        process.env.E2E_UI_LOGIN === "1" || process.env.E2E_UI_LOGIN === "true";

      if (useUiLogin) {
        await loginViaAuthForm(page, credentials!.email, credentials!.password);
        try {
          await expect(page).not.toHaveURL(/\/auth(?:\?|$)/, {
            timeout: 30_000,
          });
        } catch {
          const toast = await page
            .locator("[data-sonner-toast]")
            .first()
            .textContent()
            .catch(() => "");
          throw new Error(
            `Connexion UI échouée (resté sur /auth). Toast: ${
              toast || "aucun"
            }. ` + "Vérifiez E2E_LIVE_EMAIL/PASSWORD et VITE_USE_MOCK_AUTH."
          );
        }
      } else {
        await establishLiveSupabaseSession(
          page,
          credentials!.email,
          credentials!.password
        );
        await page.goto("/dashboard");
      }

      await page.waitForURL(/\/(dashboard|post-login|onboarding)/, {
        timeout: 30_000,
      });
      if (page.url().includes("/post-login")) {
        await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
      }
      await expect(page).toHaveURL(/\/dashboard/);
    });

    await test.step("RLS Véhicules — création et visibilité liste", async () => {
      await page.goto("/dashboard/vehicles");
      await expect(
        page.getByRole("button", { name: /Ajouter un véhicule/i })
      ).toBeVisible({
        timeout: 20_000,
      });

      await page.getByRole("button", { name: /Ajouter un véhicule/i }).click();
      await expect(page.getByRole("dialog")).toContainText(
        "Ajouter un véhicule"
      );

      await page.getByLabel("Immatriculation").fill(REGISTRATION);
      await page.getByLabel("Marque").fill("Toyota");
      await page.getByLabel("Modèle").fill("Hilux");
      await page.getByRole("button", { name: "Ajouter" }).click();

      await expect(page.getByRole("dialog")).toBeHidden({ timeout: 20_000 });
      await expect(page.getByText(REGISTRATION)).toBeVisible({
        timeout: 20_000,
      });
    });

    await test.step("RLS Maintenance — intervention visible", async () => {
      await page.goto("/dashboard/maintenance");
      await page.getByRole("button", { name: "Nouvelle intervention" }).click();
      await expect(page.getByRole("dialog")).toContainText(
        "Nouvelle intervention"
      );

      const vehicleTrigger = page
        .getByRole("dialog")
        .getByRole("combobox")
        .first();
      await selectRadixOption(page, vehicleTrigger, new RegExp(REGISTRATION));

      await page.getByRole("button", { name: "Créer" }).click();
      await expect(page.getByRole("dialog")).toBeHidden({ timeout: 20_000 });

      await expect(page.getByText(REGISTRATION)).toBeVisible({
        timeout: 20_000,
      });
    });

    await test.step("RLS Incidents — signalement visible", async () => {
      await page.goto("/dashboard/incidents");
      const reportBtn = page.getByRole("button", {
        name: /Signaler un incident/i,
      });
      const hasReport = await reportBtn.isVisible().catch(() => false);

      if (!hasReport) {
        test.info().annotations.push({
          type: "note",
          description:
            "Bouton « Signaler un incident » absent (rôle sans permission) — étape ignorée.",
        });
        return;
      }

      await reportBtn.click();
      await expect(page.getByRole("dialog")).toContainText(
        "Signaler un incident"
      );

      const geoCheckbox = page.getByRole("checkbox", {
        name: /Joindre la position au signalement/i,
      });
      if (await geoCheckbox.isChecked()) {
        await geoCheckbox.click();
      }

      const vehicleTrigger = page.locator("#vehicle");
      await selectRadixOption(page, vehicleTrigger, new RegExp(REGISTRATION));

      await page.getByLabel(/Description/i).fill(INCIDENT_MARKER);
      await page.getByRole("button", { name: /Signaler l'incident/i }).click();

      await expect(page.getByRole("dialog")).toBeHidden({ timeout: 20_000 });
      await expect(page.getByText(INCIDENT_MARKER)).toBeVisible({
        timeout: 20_000,
      });
    });

    expect(
      consoleErrors,
      `Erreurs RLS en console : ${consoleErrors.join("\n")}`
    ).toHaveLength(0);
  });
});
