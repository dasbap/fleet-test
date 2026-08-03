import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const sourceOf = (path: string) => readFileSync(path, "utf8");

describe("public marketing page hero consistency", () => {
  it("uses the modules hero format on public pages except contact", () => {
    const pages = [
      "src/pages/public/ModulesPage.tsx",
      "src/pages/public/FonctionnalitesPage.tsx",
      "src/pages/public/FonctionnaliteSectionPage.tsx",
      "src/pages/public/FaqPage.tsx",
    ];

    for (const page of pages) {
      expect(sourceOf(page), page).toContain("<PublicPageHero");
    }

    expect(sourceOf("src/pages/public/ContactPage.tsx")).not.toContain(
      "<PublicPageHero",
    );
  });
});
