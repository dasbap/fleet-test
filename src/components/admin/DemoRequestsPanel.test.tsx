import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DemoRequestsPanel } from "@/components/admin/DemoRequestsPanel";
import type { AdminDemoRequest } from "@/types/demo-request";
// todo
const hookMocks = vi.hoisted(() => ({
  requests: undefined as AdminDemoRequest[] | undefined,
  error: null as unknown,
  isError: false,
  updateAutoModeMutate: vi.fn(),
}));

Object.assign(HTMLElement.prototype, {
  hasPointerCapture: vi.fn(() => false),
  setPointerCapture: vi.fn(),
  releasePointerCapture: vi.fn(),
  scrollIntoView: vi.fn(),
});

vi.mock("@/hooks/useAdminDemoRequests", () => ({
  useAdminDemoRequests: () => ({
    data: hookMocks.requests,
    error: hookMocks.error,
    isError: hookMocks.isError,
    isLoading: false,
    refetch: vi.fn(),
  }),
  useFinalizeDemoRequest: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
  useUpdateDemoRequestAutoMode: () => ({
    mutate: hookMocks.updateAutoModeMutate,
  }),
}));

const demoRequest: AdminDemoRequest = {
  id: "demo-request-1",
  full_name: "Client Test",
  email: "client@example.com",
  company: "Client SARL",
  phone: null,
  company_identifier: null,
  country_code: "CM",
  source: null,
  message: null,
  status: "pending",
  decision_reason: null,
  decided_by: null,
  decided_at: null,
  provisioned_user_id: null,
  invitation_url: null,
  created_at: "2026-08-03T10:00:00Z",
  auto_decision_enabled: false,
  auto_decision: "refuse",
};

describe("DemoRequestsPanel", () => {
  beforeEach(() => {
    hookMocks.requests = [];
    hookMocks.error = null;
    hookMocks.isError = false;
    hookMocks.updateAutoModeMutate.mockClear();
  });

  it("affiche un message de migration manquante quand la RPC admin n'existe pas", () => {
    hookMocks.requests = undefined;
    hookMocks.error = { code: "DEMO_REQUEST_SCHEMA_MISSING" };
    hookMocks.isError = true;

    render(<DemoRequestsPanel onCreateAccess={vi.fn()} onReloadSessions={vi.fn()} />);

    expect(screen.getByText(/migration des demandes demo/i)).toBeInTheDocument();
    expect(screen.getByText(/applique la migration/i)).toBeInTheDocument();
  });

  it("met a jour visuellement le mode automatique des qu'un admin coche le switch", () => {
    hookMocks.requests = [demoRequest];

    render(<DemoRequestsPanel onCreateAccess={vi.fn()} onReloadSessions={vi.fn()} />);

    const autoMode = screen.getByRole("switch", {
      name: /decision automatique apres 48h/i,
    });
    expect(autoMode).toHaveAttribute("aria-checked", "false");

    fireEvent.click(autoMode);

    expect(autoMode).toHaveAttribute("aria-checked", "true");
    expect(hookMocks.updateAutoModeMutate).toHaveBeenCalledWith({
      enabled: true,
      decision: "refuse",
    });
  });

  it("garde la decision choisie visible apres le changement", async () => {
    hookMocks.requests = [demoRequest];

    render(<DemoRequestsPanel onCreateAccess={vi.fn()} onReloadSessions={vi.fn()} />);

    const decisionSelect = screen.getByRole("combobox");
    expect(decisionSelect).toHaveTextContent("Refuser auto");

    decisionSelect.focus();
    fireEvent.keyDown(decisionSelect, { key: "ArrowDown" });
    fireEvent.click(await screen.findByRole("option", { name: "Accepter auto" }));

    await waitFor(() => expect(decisionSelect).toHaveTextContent("Accepter auto"));
    expect(hookMocks.updateAutoModeMutate).toHaveBeenCalledWith({
      enabled: false,
      decision: "accept",
    });
  });

  it("affiche toutes les informations du formulaire de demande demo", () => {
    hookMocks.requests = [{
      ...demoRequest,
      full_name: "Awa Test",
      email: "awa@example.com",
      phone: "+237699000000",
      company: "Awa Logistics",
      company_identifier: "RCCM-123",
      country_code: "CM",
      source: "faq",
      message: "Je veux tester la plateforme avec 12 vehicules.",
    }];

    render(<DemoRequestsPanel onCreateAccess={vi.fn()} onReloadSessions={vi.fn()} />);

    expect(screen.getByText("Awa Test")).toBeInTheDocument();
    expect(screen.getByText("awa@example.com")).toBeInTheDocument();
    expect(screen.getByText("+237699000000")).toBeInTheDocument();
    expect(screen.getByText("Awa Logistics - RCCM-123 - CM")).toBeInTheDocument();
    expect(screen.getByText(/source/i)).toBeInTheDocument();
    expect(screen.getByText("faq")).toBeInTheDocument();
    expect(screen.getByText(/12 vehicules/i)).toBeInTheDocument();
  });
});
