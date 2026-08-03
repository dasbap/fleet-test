import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("FAQ admin persisted in database", () => {
  it("exposes an admin FAQ route and menu entry", () => {
    const paths = readFileSync("src/navigation/routePaths.ts", "utf8");
    const nav = readFileSync("src/config/navigation.ts", "utf8");
    const routes = readFileSync("src/app/routes/dashboard.routes.tsx", "utf8");

    expect(paths).toContain('dashboardAdminFaq: "/dashboard/admin/faq"');
    expect(nav).toContain("ROUTE_PATHS.dashboardAdminFaq");
    expect(routes).toContain('path="admin/faq"');
  });

  it("loads the public FAQ from help_articles instead of only static build data", () => {
    const publicFaqPage = readFileSync("src/pages/public/FaqPage.tsx", "utf8");
    const faqSection = readFileSync("src/components/landing/FaqSection.tsx", "utf8");
    const repository = readFileSync("src/repositories/help.repository.ts", "utf8");

    expect(repository).toContain("findPublicFaq");
    expect(publicFaqPage).toContain("usePublicFaqEntries");
    expect(faqSection).toContain("usePublicFaqEntries");
    expect(publicFaqPage).not.toContain("PUBLIC_FAQ_ENTRIES");
    expect(faqSection).not.toContain("PUBLIC_FAQ_ENTRIES");
  });
});
