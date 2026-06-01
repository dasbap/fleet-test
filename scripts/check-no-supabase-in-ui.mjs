/**
 * Interdit les imports Supabase dans composants / pages (hors allowlist).
 * Usage: node scripts/check-no-supabase-in-ui.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const allowlist = new Set([
  "integrations/supabase/client.ts",
  "repositories/",
  "services/",
  "hooks/useSessionContext.ts",
  "hooks/useHybridAuth.ts",
  "hooks/usePhoneAuth.ts",
  "hooks/useRealtimeWorker.ts",
  "hooks/useAccessCode.ts",
  "hooks/useAdminDemoAccounts.ts",
  "hooks/useDemoSession.ts",
  "hooks/useProspectDemo.ts",
  "hooks/useDeviceSessions.ts",
  "hooks/useDriverTerrainActivation.ts",
  "hooks/useTransitCemac.ts",
  "hooks/useDvir.ts",
  "hooks/useRoleAccess.ts",
  "lib/storage/",
  "lib/query/persistQueryClient.ts",
]);

const scanDirs = ["components", "pages", "features"];
const pattern = /from\s+['"]@\/integrations\/supabase\/client['"]/;
const violations = [];

function allowed(rel) {
  return [...allowlist].some((a) => rel.includes(a.replace(/\//g, "\\")) || rel.includes(a));
}

function walk(dir, base = "") {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = join(base, name).replace(/\\/g, "/");
    if (statSync(full).isDirectory()) {
      walk(full, rel);
      continue;
    }
    if (!/\.(tsx|ts)$/.test(name)) continue;
    if (allowed(rel)) continue;
    const content = readFileSync(full, "utf8");
    if (pattern.test(content)) violations.push(rel);
  }
}

for (const d of scanDirs) {
  walk(join(root, d), d);
}

if (violations.length) {
  console.error("Imports Supabase interdits dans la couche UI :\n", violations.join("\n"));
  process.exit(1);
}
console.log("OK — aucun import Supabase direct dans components/pages/features (hors allowlist).");
