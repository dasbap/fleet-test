import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { CreateDemoForm } from "@/components/admin/CreateDemoForm";
import type { CreateDemoPayload, DemoFleet } from "@/hooks/useAdminDemoAccounts";

const toastMock = vi.fn();

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

const demoFleets: DemoFleet[] = [
  {
    id: "fleet-demo-1",
    name: "Flotte demo",
  },
];

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

  it("rend le select de flotte demo sans SelectItem vide", () => {
    expect(() =>
      render(
        <CreateDemoForm
          demoFleets={demoFleets}
          onSubmit={vi.fn()}
        />,
      ),
    ).not.toThrow();

    expect(screen.getByText(/flotte d.mo assign.e/i)).toBeInTheDocument();
  });

  it("envoie fleet_id undefined quand la flotte reste en auto", async () => {
    const onSubmit = vi.fn<[], Promise<{ ok: boolean; magic_url?: string; error?: string }>>()
      .mockResolvedValue({ ok: true });

    render(
      <CreateDemoForm
        demoFleets={demoFleets}
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
    expect(payload.fleet_id).toBeUndefined();
  });
});
