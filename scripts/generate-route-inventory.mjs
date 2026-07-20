/**
 * Inventaire des routes dashboard pour audits perf / Lighthouse.
 * Usage: node scripts/generate-route-inventory.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dashboardRoutesPath = join(root, "src/app/routes/dashboard.routes.tsx");
const content = readFileSync(dashboardRoutesPath, "utf8");

const paths = ["/dashboard"];
for (const m of content.matchAll(/<Route\s+path="([^"]+)"/g)) {
  const p = m[1];
  if (p === "/dashboard" || p === "*") continue;
  paths.push(`/dashboard/${p.replace(/^\//, "")}`);
}
paths.push("/dashboard/* (404)");

const outDir = join(root, "docs/audits");
mkdirSync(outDir, { recursive: true });
const jsonPath = join(outDir, "route-inventory.json");
writeFileSync(jsonPath, JSON.stringify({ generatedAt: new Date().toISOString(), routes: paths }, null, 2));
console.log(`Wrote ${paths.length} routes to ${jsonPath}`);
