/**
 * Vérifie que le build Vite a produit les artefacts minimaux attendus sous dist/.
 * Usage : après `npm run build` ou `npm run build:capacitor`
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const root = join(import.meta.dirname, "..");
const dist = join(root, "dist");
const indexHtml = join(dist, "index.html");
const offlineHtml = join(dist, "offline.html");
const assetsDir = join(dist, "assets");

function fail(msg) {
  console.error(`[verify-dist] ${msg}`);
  process.exit(1);
}

if (!existsSync(dist)) {
  fail(`Répertoire dist/ absent. Exécuter npm run build ou npm run build:capacitor.`);
}

if (!existsSync(indexHtml)) {
  fail(`Fichier dist/index.html absent.`);
}

if (!existsSync(offlineHtml)) {
  fail(`Fichier dist/offline.html absent (copie depuis public/).`);
}

const offlineHtmlContent = readFileSync(offlineHtml, "utf8");
if (!offlineHtmlContent.includes("Connexion indisponible")) {
  fail(`dist/offline.html doit contenir le titre « Connexion indisponible ».`);
}

if (!existsSync(assetsDir)) {
  fail(`Répertoire dist/assets/ absent.`);
}

const jsFiles = readdirSync(assetsDir).filter((f) => f.endsWith(".js"));
if (jsFiles.length === 0) {
  fail(`Aucun fichier .js dans dist/assets/.`);
}

console.info(
  `[verify-dist] OK — dist/index.html, dist/offline.html, ${jsFiles.length} chunk(s) JS dans dist/assets/`,
);
