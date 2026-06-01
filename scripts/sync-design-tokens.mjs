/**
 * Vérifie la présence des fichiers tokens design-system (CI / doc).
 * Usage: node scripts/sync-design-tokens.mjs
 */
import { readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const tokensDir = join(dirname(fileURLToPath(import.meta.url)), "..", "design-system", "tokens");
const required = ["colors.json", "typography.json", "spacing.json", "radius.json", "shadows.json", "motion.json"];

for (const f of required) {
  const p = join(tokensDir, f);
  if (!existsSync(p)) {
    console.error(`Token manquant: ${p}`);
    process.exit(1);
  }
}
console.log(`OK — ${readdirSync(tokensDir).length} fichiers tokens dans design-system/tokens/`);
