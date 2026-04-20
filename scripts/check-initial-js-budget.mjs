/**
 * Vérifie que la somme gzip des JS listés dans dist/index.html (entry + modulepreload)
 * ne dépasse pas un budget (défaut 220 Ko). À lancer après `npm run build`.
 *
 * Personnalisation : BUNDLE_BUDGET_INITIAL_GZIP_KB=240 node scripts/check-initial-js-budget.mjs
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");

async function main() {
  const budgetKb = Number.parseFloat(process.env.BUNDLE_BUDGET_INITIAL_GZIP_KB ?? "270");
  let html;
  try {
    html = await readFile(join(root, "index.html"), "utf8");
  } catch {
    console.error("dist/index.html introuvable. Lancez : npm run build");
    process.exit(1);
  }

  const hrefs = new Set();
  for (const m of html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.js)"/g)) {
    hrefs.add(m[1].replace(/^\//, ""));
  }

  let totalGzip = 0;
  for (const rel of hrefs) {
    const buf = await readFile(join(root, rel));
    totalGzip += gzipSync(buf).length;
  }

  const totalKb = totalGzip / 1024;
  console.log(`Budget JS initial (gzip, somme index.html) : ${totalKb.toFixed(1)} Ko / ${budgetKb} Ko max`);

  if (totalKb > budgetKb) {
    console.error("Dépassement du budget. Réduire les modulepreload ou le graphe d’entrée.");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
