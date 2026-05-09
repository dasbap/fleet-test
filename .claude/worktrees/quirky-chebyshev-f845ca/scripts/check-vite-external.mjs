/**
 * Garde CI: interdit l'externalisation de modules front critiques dans Vite.
 * But: éviter les imports nus en production (ex: "firebase/app" introuvable navigateur).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const viteConfigPath = path.join(root, "vite.config.ts");

const forbiddenModules = [
  "firebase",
  "firebase/app",
  "firebase/messaging",
];

const source = fs.readFileSync(viteConfigPath, "utf8");

// Détecte une déclaration `external: ...` dans rollupOptions contenant un module interdit.
const externalBlockMatch = source.match(/external\s*:\s*([\s\S]*?)(,\s*output\s*:|,\s*plugins\s*:|\n\s*},)/m);
if (!externalBlockMatch) {
  console.log("OK: aucune externalisation critique détectée dans vite.config.ts.");
  process.exit(0);
}

const externalBlock = externalBlockMatch[1];
const offenders = forbiddenModules.filter((mod) =>
  new RegExp(`["'\`]${mod.replace("/", "\\/")}["'\`]`, "m").test(externalBlock),
);

if (offenders.length > 0) {
  console.error("ERREUR CI: modules front critiques externalisés dans vite.config.ts:");
  for (const mod of offenders) {
    console.error(`- ${mod}`);
  }
  console.error("Action: supprimer ces modules de rollupOptions.external.");
  process.exit(1);
}

console.log("OK: external présent mais aucun module critique détecté.");
