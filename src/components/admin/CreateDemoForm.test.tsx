import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { CreateDemoForm } from "@/components/admin/CreateDemoForm";
import type { CreateDemoPayload } from "@/hooks/useAdminDemoAccounts";

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

  it("ne propose pas de rattacher un compte demo a une flotte demo globale", () => {
    expect(() =>
      render(
        <CreateDemoForm
          onSubmit={vi.fn()}
        />,
      ),
    ).not.toThrow();

    expect(screen.queryByText(/forfait assigne/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/flotte demo/i)).not.toBeInTheDocument();
  });

  it("cree l'acces demo sans envoyer de fleet_id", async () => {
    const onSubmit = vi.fn<[], Promise<{ ok: boolean; magic_url?: string; error?: string }>>()
      .mockResolvedValue({ ok: true });

    render(
      <CreateDemoForm
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText(/email \*/i), {
      target: { value: "prospect@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /cr.er l'acc.s d.mo/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });

    const payload = onSubmit.mock.calls[0][0] as CreateDemoPayload;
    expect(payload).not.toHaveProperty("fleet_id");
  });

  it("borne la duree de creation demo a 31 jours dans le formulaire", () => {
    render(
      <CreateDemoForm
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/dur.e d'essai/i)).toHaveAttribute("max", "31");
  });

  it("cache l'acces permanent aux admins non super admin", () => {
    render(
      <CreateDemoForm
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText(/acces permanent/i)).not.toBeInTheDocument();
  });

  it("permet au super admin de creer un acces permanent", async () => {
    const onSubmit = vi.fn<[], Promise<{ ok: boolean; magic_url?: string; error?: string }>>()
      .mockResolvedValue({ ok: true });

    render(
      <CreateDemoForm
        onSubmit={onSubmit}
        canCreatePermanentAccess
      />,
    );

    fireEvent.change(screen.getByLabelText(/email \*/i), {
      target: { value: "permanent@example.com" },
    });
    fireEvent.click(screen.getByLabelText(/acces permanent/i));
    fireEvent.click(screen.getByRole("button", { name: /cr.er l'acc.s d.mo/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });

    const payload = onSubmit.mock.calls[0][0] as CreateDemoPayload;
    expect(payload.permanent_access).toBe(true);
  });
});
