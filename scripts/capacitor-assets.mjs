/**
 * Exporte resources/icon.png depuis icon.svg, puis lance @capacitor/assets
 * pour Android et iOS (sans PWA — évite d’écraser le manifest avec des chemins incorrects).
 * Couleurs Flotte E-Samba (#00C853, fond sombre #0F0F0F).
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const bin = path.join(root, "node_modules", "@capacitor", "assets", "bin", "capacitor-assets");

execSync("node scripts/export-resources-icon-png.mjs", { cwd: root, stdio: "inherit", shell: true });

const cmd = [
  process.execPath,
  bin,
  "generate",
  "--android",
  "--ios",
  "--assetPath",
  "resources",
  "--iconBackgroundColor",
  "#00C853",
  "--iconBackgroundColorDark",
  "#0F0F0F",
  "--splashBackgroundColor",
  "#00C853",
  "--splashBackgroundColorDark",
  "#0F0F0F",
  "--logoSplashScale",
  "0.22",
].join(" ");

execSync(cmd, { cwd: root, stdio: "inherit", shell: true, env: process.env });
