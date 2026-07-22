import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Index from "@/pages/Index";

vi.mock("@/components/landing/Navbar", () => ({
  default: () => <nav data-testid="navbar" />,
}));

vi.mock("@/components/landing/HeroSection", () => ({
  default: () => <section data-testid="hero-section" />,
}));

vi.mock("@/components/landing/FeaturesSection", () => ({
  default: () => <section data-testid="features-section" />,
}));

vi.mock("@/components/landing/ModulesSection", () => ({
  default: () => <section data-testid="modules-section" />,
}));

vi.mock("@/components/landing/PricingSection", () => ({
  default: () => <section data-testid="pricing-section" />,
}));

vi.mock("@/components/landing/DemoVideoSection", () => ({
  DemoVideoSection: () => <section data-testid="demo-video-section" />,
}));

vi.mock("@/components/landing/DemoRequestSection", () => ({
  DemoRequestSection: () => <section data-testid="demo-request-section" />,
}));

vi.mock("@/components/landing/FaqSection", () => ({
  FaqSection: () => <section data-testid="faq-section" />,
}));

vi.mock("@/components/landing/Footer", () => ({
  default: () => <footer data-testid="footer" />,
}));

vi.mock("@/components/landing/WhatsAppButton", () => ({
  WhatsAppButton: () => <a data-testid="whatsapp-button" href="https://wa.me/test" />,
}));

describe("Index", () => {
  it("garde la page d'accueil courte", () => {
    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("navbar")).toBeInTheDocument();
    expect(screen.getByTestId("hero-section")).toBeInTheDocument();
    expect(screen.queryByTestId("features-section")).not.toBeInTheDocument();
    expect(screen.queryByTestId("modules-section")).not.toBeInTheDocument();
    expect(screen.queryByTestId("pricing-section")).not.toBeInTheDocument();
    expect(screen.queryByTestId("demo-video-section")).not.toBeInTheDocument();
    expect(screen.queryByTestId("demo-request-section")).not.toBeInTheDocument();
    expect(screen.queryByTestId("faq-section")).not.toBeInTheDocument();
    expect(screen.queryByTestId("footer")).not.toBeInTheDocument();
    expect(screen.queryByTestId("whatsapp-button")).not.toBeInTheDocument();
  });
});
