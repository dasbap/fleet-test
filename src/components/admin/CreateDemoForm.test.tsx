import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { CreateDemoForm } from "@/components/admin/CreateDemoForm";

const toastMock = vi.fn();

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

describe("CreateDemoForm", () => {
  beforeAll(() => {
    class ResizeObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    Object.defineProperty(window, "ResizeObserver", {
      writable: true,
      configurable: true,
      value: ResizeObserverMock,
    });
  });

  beforeEach(() => {
    toastMock.mockReset();
  });

  it("demande toutes les informations du client", () => {
    render(<CreateDemoForm onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/nom complet/i)).toBeRequired();
    expect(screen.getByLabelText(/email \*/i)).toBeRequired();
    expect(screen.getByLabelText(/^entreprise \*$/i)).toBeRequired();
    expect(screen.getByLabelText(/téléphone/i)).toBeRequired();
    expect(screen.getByLabelText(/identifiant entreprise/i)).toBeRequired();
    expect(screen.getByText(/pays \*/i)).toBeInTheDocument();
  });

  it("bloque la creation si le profil client est incomplet", () => {
    const onSubmit = vi.fn();
    render(<CreateDemoForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/email \*/i), { target: { value: "prospect@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /cr.er l'acc.s d.mo/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("ne propose pas de rattacher un compte demo a une flotte demo globale", () => {
    render(<CreateDemoForm onSubmit={vi.fn()} />);
    expect(screen.queryByText(/forfait assigne/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/flotte demo/i)).not.toBeInTheDocument();
  });

  it("borne la duree de creation demo a 31 jours", () => {
    render(<CreateDemoForm onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/dur.e d'essai/i)).toHaveAttribute("max", "31");
  });

  it("cache l'acces permanent aux admins non super admin", () => {
    render(<CreateDemoForm onSubmit={vi.fn()} />);
    expect(screen.queryByLabelText(/acces permanent/i)).not.toBeInTheDocument();
  });

  it("affiche l'acces permanent au super admin", () => {
    render(<CreateDemoForm onSubmit={vi.fn()} canCreatePermanentAccess />);
    expect(screen.getByLabelText(/acces permanent/i)).toBeInTheDocument();
  });
});
