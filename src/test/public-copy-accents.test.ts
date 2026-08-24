import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const sourceOf = (path: string) => readFileSync(path, "utf8");

describe("public copy accents", () => {
  it("keeps the public FAQ hero and empty state accented", () => {
    const source = sourceOf("src/pages/public/FaqPage.tsx");
    const fallbackSource = sourceOf("src/data/marketing/faq-public.ts");

    expect(source).toContain('title="Questions fréquentes"');
    expect(source).toContain("démarrer avec E-Samba");
    expect(source).toContain("Aucun résultat");
    expect(fallbackSource).toContain("À qui s'adresse E-Samba ?");
    expect(fallbackSource).toContain("véhicules");
    expect(fallbackSource).toContain("démarrer");
    expect(fallbackSource).toContain("données restent-elles protégées");
    expect(fallbackSource).toContain("demander une démo");
  });

  it("keeps the demo contact form copy accented", () => {
    const source = sourceOf("src/components/landing/ContactDemoForm.tsx");

    expect(source).toContain("Guinée équatoriale");
    expect(source).toContain("Sélectionnez un pays");
    expect(source).toContain("Demande envoyée");
    expect(source).toContain("Planifier ma démo gratuite");
    expect(source).toContain("Téléphone");
    expect(source).toContain("Numéro d'identifiant entreprise");
    expect(source).toContain("Demander ma démo");
  });
});
