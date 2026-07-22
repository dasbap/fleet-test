#!/usr/bin/env node
/**
 * Installe les navigateurs Playwright (Chromium, Firefox, WebKit) hors Vercel,
 * alignés sur @playwright/test pour les smokes et `npm run test:e2e`.
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

if (process.env.VERCEL) {
  console.log(
    "Vercel détecté — installation Playwright ignorée (inutile au build front)."
  );
  process.exit(0);
}

if (
  process.env.CI === "true" ||
  process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD === "1"
) {
  console.log(
    "CI détectée — installation Playwright ignorée pendant npm ci."
  );
  process.exit(0);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");

try {
  execSync("npx playwright install chromium firefox webkit", {
    stdio: "inherit",
    cwd: repoRoot,
    shell: process.platform === "win32",
    env: process.env,
  });
} catch {
  // Non bloquant : environnements sans réseau ou sans binaires Playwright.
  console.warn(
    "playwright install ignoré (réseau indisponible ou binaires déjà présents)."
  );
}
