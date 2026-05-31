/**
 * Garde CI : interdit les noms de colonnes obsolètes sur affectations_vehicules
 * dans les fichiers SQL du dépôt (hors commentaires explicites).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const scanRoots = [
  path.join(root, "supabase"),
  path.join(root, "scripts"),
];

const obsoleteColumnPatterns = [
  /\bpilote_user_id\b/i,
  /\bconducteur_user_id\b/i,
  /\baffectations_vehicules\.flotte_id\b/i,
  /\bav\.flotte_id\b/i,
  /\ba\.flotte_id\b/i,
  /\binsert\s+into\s+public\.affectations_vehicules\s*\([^)]*\bflotte_id\b/i,
  /\binsert\s+into\s+affectations_vehicules\s*\([^)]*\bflotte_id\b/i,
  /\bupdate\s+public\.affectations_vehicules\b[^;]*\bset\b[^;]*\bflotte_id\b/i,
  /\bupdate\s+affectations_vehicules\b[^;]*\bset\b[^;]*\bflotte_id\b/i,
];

/** Lignes contenant affectations_vehicules avec driver_id comme colonne (pas p_driver_id). */
const driverIdOnAssignment =
  /affectations_vehicules[\s\S]{0,120}\bdriver_id\b(?!_user_id)/i;

function collectSqlFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      collectSqlFiles(full, acc);
    } else if (entry.name.endsWith(".sql")) {
      acc.push(full);
    }
  }
  return acc;
}

function isCommentOnly(line) {
  const trimmed = line.trim();
  return trimmed.startsWith("--") || trimmed.startsWith("/*") || trimmed === "*/";
}

function stripInlineComment(line) {
  const idx = line.indexOf("--");
  return idx >= 0 ? line.slice(0, idx) : line;
}

const offenders = [];

for (const scanRoot of scanRoots) {
  for (const file of collectSqlFiles(scanRoot)) {
    const rel = path.relative(root, file).replace(/\\/g, "/");
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);

    lines.forEach((rawLine, index) => {
      if (isCommentOnly(rawLine)) return;
      const line = stripInlineComment(rawLine);
      if (!/\baffectations_vehicules\b/i.test(line)) return;

      for (const pattern of obsoleteColumnPatterns) {
        if (pattern.test(line)) {
          offenders.push({ file: rel, line: index + 1, text: rawLine.trim() });
          return;
        }
      }

      if (driverIdOnAssignment.test(line) && !/\bp_driver_id\b/i.test(line)) {
        offenders.push({
          file: rel,
          line: index + 1,
          text: rawLine.trim(),
          reason: "driver_id sur affectations_vehicules (utiliser driver_user_id)",
        });
      }
    });
  }
}

if (offenders.length > 0) {
  console.error("ERREUR: colonnes obsolètes détectées près de affectations_vehicules :\n");
  for (const o of offenders) {
    console.error(`  ${o.file}:${o.line}`);
    console.error(`    ${o.text}`);
    if (o.reason) console.error(`    → ${o.reason}`);
  }
  console.error(
    "\nUtiliser fleet_id et driver_user_id (pas flotte_id / pilote_user_id).",
  );
  process.exit(1);
}

console.log("OK: aucune colonne obsolète affectations_vehicules dans les .sql scannés.");
