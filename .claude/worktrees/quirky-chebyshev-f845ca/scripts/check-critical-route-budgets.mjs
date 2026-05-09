/**
 * Vérifie le budget JS initial gzip pour plusieurs routes critiques.
 * Analyse les fichiers HTML générés dans dist/ (entry + modulepreload).
 *
 * Usage:
 *   node scripts/check-critical-route-budgets.mjs
 *   ROUTE_BUDGETS='[{ "route": "/", "maxGzipKb": 220 }]' node scripts/check-critical-route-budgets.mjs
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const distRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");

// Budgets relevés temporairement (dette tracée dans docs/todo-bundle-initial-optimization.md).
// /login n'est pas prérendue : seule /auth est canonique (src/lib/seo.ts).
const defaultBudgets = [
  { route: "/", maxGzipKb: 330 },
  { route: "/auth", maxGzipKb: 330 },
];

function normalizeRoute(route) {
  if (!route || route === "/") return "/";
  return route.startsWith("/") ? route : `/${route}`;
}

function htmlPathForRoute(route) {
  const normalized = normalizeRoute(route);
  if (normalized === "/") return join(distRoot, "index.html");
  return join(distRoot, normalized.slice(1), "index.html");
}

async function collectInitialJsGzipBytes(htmlContent) {
  const hrefs = new Set();
  for (const m of htmlContent.matchAll(/(?:src|href)="(\/assets\/[^"]+\.js)"/g)) {
    hrefs.add(m[1].replace(/^\//, ""));
  }

  let total = 0;
  for (const rel of hrefs) {
    const fileBuffer = await readFile(join(distRoot, rel));
    total += gzipSync(fileBuffer).length;
  }
  return total;
}

async function main() {
  const budgets = process.env.ROUTE_BUDGETS
    ? JSON.parse(process.env.ROUTE_BUDGETS)
    : defaultBudgets;

  const failures = [];

  for (const cfg of budgets) {
    const route = normalizeRoute(cfg.route);
    const maxGzipKb = Number(cfg.maxGzipKb);
    const htmlPath = htmlPathForRoute(route);

    let html;
    try {
      html = await readFile(htmlPath, "utf8");
    } catch {
      failures.push({ route, reason: `HTML introuvable (${htmlPath})` });
      continue;
    }

    const totalKb = (await collectInitialJsGzipBytes(html)) / 1024;
    const ok = totalKb <= maxGzipKb;
    const status = ok ? "OK" : "FAIL";
    console.log(`[${status}] ${route} -> ${totalKb.toFixed(1)} Ko / ${maxGzipKb} Ko`);

    if (!ok) {
      failures.push({
        route,
        reason: `budget dépassé (${totalKb.toFixed(1)} Ko > ${maxGzipKb} Ko)`,
      });
    }
  }

  if (failures.length > 0) {
    console.error("\nBudgets routes critiques non respectés:");
    for (const failure of failures) {
      console.error(`- ${failure.route}: ${failure.reason}`);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
