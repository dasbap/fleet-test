import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { signOut, signInWithOtp, getSession, onAuthStateChange, mutateAsync, authState, demoAuth } = vi.hoisted(() => {
  const signOut = vi.fn();
  const signInWithOtp = vi.fn();
  const getSession = vi.fn();
  const onAuthStateChange = vi.fn();
  const mutateAsync = vi.fn();
  const authState = { callback: null as null | ((event: string, session: unknown) => void), unsubscribe: vi.fn() };
  return {
    signOut,
    signInWithOtp,
    getSession,
    onAuthStateChange,
    mutateAsync,
    authState,
    demoAuth: { signOut, signInWithOtp, getSession, onAuthStateChange },
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: {} },
  demoVerificationSupabase: { auth: demoAuth },
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

function fillForm() {
  fireEvent.change(screen.getByLabelText("Nom complet *"), { target: { value: "Jean Dupont" } });
  fireEvent.change(screen.getByLabelText("Entreprise *"), { target: { value: "TransCam" } });
  fireEvent.change(screen.getByLabelText("Adresse mail *"), { target: { value: "contact@transcam.cm" } });
  fireEvent.change(screen.getByLabelText("Téléphone *"), { target: { value: "+237 600000000" } });
  fireEvent.change(screen.getByLabelText("Numéro d'identifiant entreprise *"), { target: { value: "RCCM-DLA-2026-B-123" } });
  fireEvent.change(screen.getByRole("combobox", { name: "Pays *" }), { target: { value: "CM" } });
}

describe("ContactDemoForm user flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.history.replaceState({}, "", "/contact");
    authState.callback = null;
    authState.unsubscribe.mockReset();
    signInWithOtp.mockResolvedValue({ data: {}, error: null });
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
    fillForm();

    fireEvent.click(screen.getByRole("button", { name: "Vérifier" }));
    await waitFor(() => expect(signInWithOtp).toHaveBeenCalledWith({
      email: "contact@transcam.cm",
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback?intent=demo`,
        data: { demo_verification_pending: true },
      },
    }));

    expect(await screen.findByText("En attente de votre confirmation")).toBeInTheDocument();
    await waitFor(() => expect(authState.callback).not.toBeNull());
    authState.callback?.("SIGNED_IN", verifiedSession);

    expect(await screen.findByText(/Adresse e-mail vérifiée par E-Samba\./)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Demander ma démo" }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({
      name: "Jean Dupont",
      email: "contact@transcam.cm",
      company: "TransCam",
      phone: "+237600000000",
      companyIdentifier: "RCCM-DLA-2026-B-123",
      countryCode: "CM",
      emailVerificationToken: "verified-token",
    }));
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(await screen.findByText("Demande envoyée !")).toBeInTheDocument();
  });

  it("demande de reessayer quand Supabase refuse temporairement l'envoi", async () => {
    signInWithOtp.mockResolvedValueOnce({
      data: {},
      error: new Error("email rate limit exceeded"),
    });
    render(<ContactDemoForm />);
    fillForm();

    fireEvent.click(screen.getByRole("button", { name: "Vérifier" }));

    expect(await screen.findByText("Supabase limite temporairement l'envoi des e-mails. Réessayez dans quelques minutes.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Vérifier" })).toBeEnabled();
    expect(screen.queryByText("En attente de votre confirmation")).not.toBeInTheDocument();
  });

  it("affiche une erreur utilisateur quand l'environnement Supabase n'est pas synchronise", async () => {
    mutateAsync.mockRejectedValue(new Error("Le service de demande de démo n'est pas encore configuré sur cet environnement. Réessayez plus tard."));
    render(<ContactDemoForm />);
    fillForm();

    fireEvent.click(screen.getByRole("button", { name: "Vérifier" }));
    await waitFor(() => expect(authState.callback).not.toBeNull());
    authState.callback?.("SIGNED_IN", verifiedSession);
    expect(await screen.findByText(/Adresse e-mail vérifiée par E-Samba\./)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Demander ma démo" }));

    expect(await screen.findByText("Le service de demande de démo n'est pas encore configuré sur cet environnement. Réessayez plus tard.")).toBeInTheDocument();
    expect(screen.queryByText("Demande envoyée !")).not.toBeInTheDocument();
  });

  it("bloque un téléphone incompatible avant d'envoyer le magic-link", async () => {
    render(<ContactDemoForm />);
    fillForm();
    fireEvent.change(screen.getByLabelText("Téléphone *"), { target: { value: "+24166123456" } });

    fireEvent.click(screen.getByRole("button", { name: "Vérifier" }));

    expect(await screen.findByText("Le numéro doit correspondre au pays sélectionné (+237)." )).toBeInTheDocument();
    expect(signInWithOtp).not.toHaveBeenCalled();
  });
});
