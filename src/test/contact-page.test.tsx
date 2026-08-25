import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import ContactPage from "@/pages/public/ContactPage";

vi.mock("@/hooks/usePageSeo", () => ({
  usePageSeo: vi.fn(),
}));

vi.mock("@/components/landing/PublicPageLayout", () => ({
  PublicPageLayout: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

vi.mock("@/components/landing/ContactDemoForm", () => ({
  ContactDemoForm: () => <form data-testid="contact-demo-form" />,
}));

describe("ContactPage", () => {
  it("affiche directement le contenu contact sans hero marketing", () => {
    render(
      <MemoryRouter>
        <ContactPage />
      </MemoryRouter>,
    );

    expect(screen.queryByText("Parlons de votre flotte")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Demandez une démo personnalisée ou contactez notre équipe commerciale."),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Nous contacter" })).toBeInTheDocument();
    expect(screen.getByTestId("contact-demo-form")).toBeInTheDocument();
  });

  it("expose le titre contact comme h1 principal", () => {
    render(
      <MemoryRouter>
        <ContactPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Nous contacter" })).toBeInTheDocument();
  });
});
