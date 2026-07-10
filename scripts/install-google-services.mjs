#!/usr/bin/env node
/**
 * Copie google-services.json depuis un chemin local (Firebase Console) vers android/app/.
 * Usage : définir GOOGLE_SERVICES_JSON_PATH dans .env.local puis npm run install:google-services
 */

import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvWithLocalFallback } from "./_env-loader.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dest = join(root, "android", "app", "google-services.json");

loadEnvWithLocalFallback(root);

const src = process.env.GOOGLE_SERVICES_JSON_PATH?.trim();
if (!src) {
  console.error("GOOGLE_SERVICES_JSON_PATH absent dans .env.local");
  console.error("Téléchargez google-services.json depuis Firebase (taxis-flotte / com.esamba.flotte)");
  process.exit(1);
}

if (!existsSync(src)) {
  console.error(`Fichier introuvable : ${src}`);
  process.exit(1);
}

let parsed;
try {
  parsed = JSON.parse(readFileSync(src, "utf8"));
} catch {
  console.error("Fichier source invalide (JSON attendu)");
  process.exit(1);
}

const projectId = parsed?.project_info?.project_id ?? "";
const clients = Array.isArray(parsed?.client) ? parsed.client : [];
const packageNames = clients
  .map((client) => client?.client_info?.android_client_info?.package_name)
  .filter(Boolean);

if (projectId !== "taxis-flotte") {
  console.warn(`ATTENTION: project_id=${projectId} (attendu taxis-flotte)`);
}
if (!packageNames.includes("com.esamba.flotte")) {
  console.error(
    `Package Android com.esamba.flotte absent de google-services.json (trouves: ${packageNames.join(", ") || "aucun"})`,
  );
  console.error("Telechargez le fichier depuis l'app Firebase Android com.esamba.flotte.");
  process.exit(1);
}

copyFileSync(src, dest);
console.log(`OK: copié vers ${dest}`);
