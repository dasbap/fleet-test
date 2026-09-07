import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { signOut, getSession, onAuthStateChange, mutateAsync, fetchMock, authState } = vi.hoisted(() => ({
  signOut: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  mutateAsync: vi.fn(),
  fetchMock: vi.fn(),
  authState: { callback: null as null | ((event: string, session: unknown) => void), unsubscribe: vi.fn() },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { signOut, getSession, onAuthStateChange } },
}));
vi.mock("@/hooks/useSubmitDemoRequest", () => ({
  useSubmitDemoRequest: () => ({ mutateAsync, isPending: false }),
}));
vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: { value: string; onValueChange: (value: string) => void; children: React.ReactNode }) => (
    <select aria-label="Pays *" value={value} onChange={(event) => onValueChange(event.target.value)}>{children}</select>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <option value="">{placeholder}</option>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => <option value={value}>{children}</option>,
}));

import { ContactDemoForm } from "@/components/landing/ContactDemoForm";

const verifiedSession = {
  access_token: "verified-token",
  user: {
    id: "user-1",
    email: "contact@transcam.cm",
    email_confirmed_at: "2026-09-07T12:00:00.000Z",
    user_metadata: { demo_verification_pending: true },
  },
};

describe("ContactDemoForm user flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    window.localStorage.clear();
    window.history.replaceState({}, "", "/contact");
    authState.callback = null;
    authState.unsubscribe.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ ok: true, queued: false }),
    });
    signOut.mockResolvedValue({ error: null });
    getSession.mockResolvedValue({ data: { session: null }, error: null });
    onAuthStateChange.mockImplementation((callback) => {
      authState.callback = callback;
      return { data: { subscription: { unsubscribe: authState.unsubscribe } } };
    });
    mutateAsync.mockResolvedValue(undefined);
  });

  it("attend le clic magic-link puis soumet toutes les informations client", async () => {
    render(<ContactDemoForm />);

    fireEvent.change(screen.getByLabelText("Nom complet *"), { target: { value: "Jean Dupont" } });
    fireEvent.change(screen.getByLabelText("Entreprise *"), { target: { value: "TransCam" } });
    fireEvent.change(screen.getByLabelText("Adresse mail *"), { target: { value: "contact@transcam.cm" } });
    fireEvent.change(screen.getByLabelText("Téléphone *"), { target: { value: "+237 600 000 000" } });
    fireEvent.change(screen.getByLabelText("Numéro d'identifiant entreprise *"), { target: { value: "RCCM-DLA-2026-B-123" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Pays *" }), { target: { value: "CM" } });

    fireEvent.click(screen.getByRole("button", { name: "Vérifier" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/demo/verification-email", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ email: "contact@transcam.cm" }),
    })));

    expect(await screen.findByText("En attente de votre confirmation")).toBeInTheDocument();
    await waitFor(() => expect(authState.callback).not.toBeNull());
    authState.callback?.("SIGNED_IN", verifiedSession);

    await screen.findByText("Adresse e-mail vérifiée par E-Samba.");
    fireEvent.click(screen.getByRole("button", { name: "Demander ma démo" }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({
      name: "Jean Dupont",
      email: "contact@transcam.cm",
      company: "TransCam",
      phone: "+237 600 000 000",
      companyIdentifier: "RCCM-DLA-2026-B-123",
      countryCode: "CM",
      emailVerificationToken: "verified-token",
    }));
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(await screen.findByText("Demande envoyée !")).toBeInTheDocument();
  });

  it("affiche la liste d'attente lorsque le quota quotidien est atteint", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 202,
      json: vi.fn().mockResolvedValue({ ok: true, queued: true }),
    });
    render(<ContactDemoForm />);

    fireEvent.change(screen.getByLabelText("Nom complet *"), { target: { value: "Jean Dupont" } });
    fireEvent.change(screen.getByLabelText("Entreprise *"), { target: { value: "TransCam" } });
    fireEvent.change(screen.getByLabelText("Adresse mail *"), { target: { value: "contact@transcam.cm" } });
    fireEvent.change(screen.getByLabelText("Téléphone *"), { target: { value: "+237600000000" } });
    fireEvent.change(screen.getByLabelText("Numéro d'identifiant entreprise *"), { target: { value: "RCCM-123" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Pays *" }), { target: { value: "CM" } });
    fireEvent.click(screen.getByRole("button", { name: "Vérifier" }));

    expect(await screen.findByText("Demande placée en liste d'attente")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "En attente" })).toBeDisabled();
    expect(screen.getByText(/recevra automatiquement son lien de vérification/)).toBeInTheDocument();
  });

  it("affiche une erreur utilisateur quand l'environnement Supabase n'est pas synchronise", async () => {
    mutateAsync.mockRejectedValue(new Error("Le service de demande de démo n'est pas encore configuré sur cet environnement. Réessayez plus tard."));
    render(<ContactDemoForm />);

    fireEvent.change(screen.getByLabelText("Nom complet *"), { target: { value: "Jean Dupont" } });
    fireEvent.change(screen.getByLabelText("Entreprise *"), { target: { value: "TransCam" } });
    fireEvent.change(screen.getByLabelText("Adresse mail *"), { target: { value: "contact@transcam.cm" } });
    fireEvent.change(screen.getByLabelText("Téléphone *"), { target: { value: "+237600000000" } });
    fireEvent.change(screen.getByLabelText("Numéro d'identifiant entreprise *"), { target: { value: "RCCM-123" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Pays *" }), { target: { value: "CM" } });
    fireEvent.click(screen.getByRole("button", { name: "Vérifier" }));
    await waitFor(() => expect(authState.callback).not.toBeNull());
    authState.callback?.("SIGNED_IN", verifiedSession);
    await screen.findByText("Adresse e-mail vérifiée par E-Samba.");
    fireEvent.click(screen.getByRole("button", { name: "Demander ma démo" }));

    expect(await screen.findByText("Le service de demande de démo n'est pas encore configuré sur cet environnement. Réessayez plus tard.")).toBeInTheDocument();
    expect(screen.queryByText("Demande envoyée !")).not.toBeInTheDocument();
  });
});
