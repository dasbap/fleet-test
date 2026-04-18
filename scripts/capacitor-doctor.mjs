#!/usr/bin/env node

/**
 * Diagnostic léger Capacitor pour clarifier les erreurs fréquentes liées à Node.
 * Ne bloque pas le workflow : affiche des conseils explicites avant sync.
 */
function parseMajor(version) {
  const cleaned = version.replace(/^v/, "");
  const major = Number.parseInt(cleaned.split(".")[0] ?? "", 10);
  return Number.isNaN(major) ? null : major;
}

const requiredMajor = 22;
const currentMajor = parseMajor(process.version);

if (currentMajor === null) {
  console.log(
    "[Capacitor doctor] Version Node non reconnue. Utilisez `npm run cap:sync` pour forcer la CLI Capacitor avec Node 22."
  );
  process.exit(0);
}

if (currentMajor < requiredMajor) {
  console.log(
    `[Capacitor doctor] Node local détecté: ${process.version}.`
  );
  console.log(
    "[Capacitor doctor] `npx cap sync` échouera (Capacitor CLI exige Node >=22)."
  );
  console.log(
    "[Capacitor doctor] Utilisez `npm run cap:sync` (runtime Node 22 isolé) ou `npm run mobile:prepare`."
  );
  process.exit(0);
}

console.log(
  `[Capacitor doctor] Node local ${process.version} compatible. Vous pouvez exécuter \`npx cap sync\` ou \`npm run cap:sync\`.`
);
