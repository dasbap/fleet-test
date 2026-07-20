/**
 * Écrit les 6 fichiers de config greenfield dans esamba-app/ (ou chemin passé en argument).
 * Usage : npm run greenfield:write-configs [chemin-cible]
 * Exemple : npm run greenfield:write-configs -- ./esamba-app
 */
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { GREENFIELD_CONFIG_BUNDLE } from "../docs/bootstrap/greenfield-config-contents.ts";

const GREENFIELD_PACKAGE_SCRIPTS: Record<string, string> = {
  "mobile:prepare": "npm run build && npx cap sync",
  "cap:sync": "npx cap sync",
  android: "npm run mobile:prepare && npx cap open android",
  ios: "npm run mobile:prepare && npx cap open ios",
};

const targetDir = resolve(process.cwd(), process.argv[2] ?? "esamba-app");

if (!targetDir) {
  console.error("Chemin cible manquant.");
  process.exit(1);
}

console.log(`Écriture des configs greenfield → ${targetDir}`);

for (const [relPath, content] of Object.entries(GREENFIELD_CONFIG_BUNDLE)) {
  const fullPath = join(targetDir, relPath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
  console.log(`  OK ${relPath}`);
}

// tailwindcss init -p crée tailwind.config.js ; on utilise tailwind.config.cjs
const staleTailwindJs = join(targetDir, "tailwind.config.js");
if (existsSync(staleTailwindJs)) {
  unlinkSync(staleTailwindJs);
  console.log("  supprimé tailwind.config.js (remplacé par tailwind.config.cjs)");
}

patchGreenfieldPackageJson(targetDir);

console.log("Terminé. Éditez .env puis : npm run dev");

function patchGreenfieldPackageJson(dir: string): void {
  const pkgPath = join(dir, "package.json");
  if (!existsSync(pkgPath)) return;

  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
    scripts?: Record<string, string>;
  };
  pkg.scripts = { ...pkg.scripts, ...GREENFIELD_PACKAGE_SCRIPTS };
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
  console.log("  OK package.json (scripts mobile:prepare, cap:sync, android, ios)");
}
