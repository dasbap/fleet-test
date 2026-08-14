import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const scannedRoots = [
  "apps/marketing/src",
  "apps/esamba-web/src/app",
  "apps/esamba-web/src/lib/seo",
  "apps/marketing/scripts/generate-mdx-stubs.mjs",
  "src/pages/Upgrade.tsx",
];

const scannedExtensions = new Set([".astro", ".mdx", ".ts", ".tsx", ".mjs"]);

function listSourceFiles(path: string): string[] {
  if (statSync(path).isFile()) {
    return scannedExtensions.has(path.slice(path.lastIndexOf("."))) ? [path] : [];
  }

  return readdirSync(path).flatMap((entry) => listSourceFiles(join(path, entry)));
}

describe("public free-plan request CTAs", () => {
  it("does not let users request a free plan from public and upgrade surfaces", () => {
    const forbidden = [
      "Demander le gratuit",
      "Démarrer gratuitement",
      "Commencer gratuitement",
      "Créer mon compte gratuitement",
      "Créer mon compte gratuit",
      "Créer un compte gratuit",
      "compte gratuit",
      "Essai gratuit",
      "essai gratuit",
      "offre gratuite",
      "offre Gratuite",
      "14 jours d'essai gratuit",
      "14 jours",
      "gratuitement",
    ];

    const sources = scannedRoots
      .flatMap(listSourceFiles)
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");

    for (const text of forbidden) {
      expect(sources).not.toContain(text);
    }
  });
});
