import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvWithLocalFallback } from "../../../scripts/_env-loader.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
loadEnvWithLocalFallback(repoRoot);

/**
 * Variables d'environnement pour les E2E « live » contre Supabase prod/staging.
 * Activés uniquement si RUN_E2E_LIVE=1.
 */

export function isLiveE2EEnabled(): boolean {
  return process.env.RUN_E2E_LIVE === "1" || process.env.RUN_E2E_LIVE === "true";
}

function firstNonEmpty(...values: Array<string | undefined>): string {
  for (const v of values) {
    const t = v?.trim();
    if (t) return t;
  }
  return "";
}

export function getLiveE2ECredentials(): { email: string; password: string } | null {
  const email = firstNonEmpty(
    process.env.E2E_LIVE_EMAIL,
    process.env.PLAYWRIGHT_TEST_EMAIL,
    process.env.TEST_INTEGRATION_EMAIL,
    process.env.SUPABASE_TEST_EMAIL,
  );
  const password = firstNonEmpty(
    process.env.E2E_LIVE_PASSWORD,
    process.env.PLAYWRIGHT_TEST_PASSWORD,
    process.env.TEST_INTEGRATION_PASSWORD,
    process.env.SUPABASE_TEST_PASSWORD,
  );
  if (!email || !password) return null;
  if (email.includes("exemple.com") || email.endsWith("@test")) {
    return null;
  }
  return { email, password };
}

export function getMissingLiveE2EEnv(): string[] {
  const missing: string[] = [];
  if (!isLiveE2EEnabled()) {
    missing.push("RUN_E2E_LIVE=1");
  }
  if (!getLiveE2ECredentials()) {
    missing.push(
      "E2E_LIVE_EMAIL + E2E_LIVE_PASSWORD (ou PLAYWRIGHT_TEST_* / TEST_INTEGRATION_* / SUPABASE_TEST_*)",
    );
  }
  if (!process.env.VITE_SUPABASE_URL?.trim()) missing.push("VITE_SUPABASE_URL");
  if (!process.env.VITE_SUPABASE_ANON_KEY?.trim()) missing.push("VITE_SUPABASE_ANON_KEY");
  return missing;
}

export function canRunLiveE2E(): boolean {
  return getMissingLiveE2EEnv().length === 0;
}

export function liveE2ESkipReason(): string {
  return `E2E live désactivé ou incomplet : ${getMissingLiveE2EEnv().join(", ")}`;
}
