/**
 * Rapport des tailles des chunks JS après `vite build` (brut + gzip).
 * Usage : npm run build && node scripts/report-build-chunks.mjs
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "dist", "assets");

async function main() {
  let files;
  try {
    files = await readdir(root);
  } catch {
    console.error("Dossier dist/assets introuvable. Lancez d'abord : npm run build");
    process.exit(1);
  }

  const jsFiles = files.filter((f) => f.endsWith(".js"));
  const rows = [];

  for (const name of jsFiles) {
    const buf = await readFile(join(root, name));
    const gz = gzipSync(buf);
    rows.push({
      name,
      raw: buf.length,
      gzip: gz.length,
    });
  }

  rows.sort((a, b) => b.gzip - a.gzip);

  console.log("Chunks JS (triés par taille gzip décroissante) :\n");
  console.log(
    ["fichier", "brut Ko", "gzip Ko"]
      .map((h, i) => (i === 0 ? h.padEnd(42) : h.padStart(10)))
      .join(""),
  );
  for (const r of rows) {
    console.log(
      `${r.name.padEnd(42)}${(r.raw / 1024).toFixed(1).padStart(10)}${(r.gzip / 1024).toFixed(1).padStart(10)}`,
    );
  }

  const sumGzip = rows.reduce((s, r) => s + r.gzip, 0);
  console.log(`\nTotal tous chunks JS (gzip) : ${(sumGzip / 1024).toFixed(1)} Ko — ${rows.length} fichiers`);

  /* Assets référencés par index.html (chargement initial documenté) */
  const indexPath = join(dirname(fileURLToPath(import.meta.url)), "..", "dist", "index.html");
  try {
    const html = await readFile(indexPath, "utf8");
    const hrefs = new Set();
    for (const m of html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.js)"/g)) {
      hrefs.add(m[1].replace(/^\//, ""));
    }
    if (hrefs.size > 0) {
      let initialGzip = 0;
      console.log("\n--- Référencés dans index.html (script + modulepreload) ---\n");
      for (const rel of hrefs) {
        try {
          const p = join(dirname(fileURLToPath(import.meta.url)), "..", "dist", rel);
          const buf = await readFile(p);
          const gz = gzipSync(buf).length;
          initialGzip += gz;
          console.log(`${rel}  gzip ${(gz / 1024).toFixed(1)} Ko`);
        } catch {
          console.warn(`(absent) ${rel}`);
        }
      }
      console.log(`\nSomme gzip (initial HTML) : ${(initialGzip / 1024).toFixed(1)} Ko`);
    }
  } catch {
    /* ignore */
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
