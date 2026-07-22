import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import ModulesPage from "@/pages/public/ModulesPage";

vi.mock("@/hooks/usePageSeo", () => ({
  usePageSeo: vi.fn(),
}));

describe("ModulesPage", () => {
  it("ne pointe plus les modules vers le site marketing", () => {
    render(
      <MemoryRouter>
        <ModulesPage />
      </MemoryRouter>,
    );

    const hrefs = screen
      .queryAllByRole("link")
      .map((link) => link.getAttribute("href") ?? "");

    expect(hrefs.every((href) => !href.includes("marketing.e-samba.com"))).toBe(true);
  });
});
