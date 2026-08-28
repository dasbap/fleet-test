import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { signInWithOtp, verifyOtp, mutateAsync, createEphemeralSupabaseClient } = vi.hoisted(() => ({
  signInWithOtp: vi.fn(),
  verifyOtp: vi.fn(),
  mutateAsync: vi.fn(),
  createEphemeralSupabaseClient: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({ createEphemeralSupabaseClient }));
vi.mock("@/hooks/useSubmitDemoRequest", () => ({
  useSubmitDemoRequest: () => ({ mutateAsync, isPending: false }),
}));
vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: { value: string; onValueChange: (value: string) => void; children: React.ReactNode }) => (
    <div data-value={value} onChange={(event) => onValueChange((event.target as HTMLSelectElement).value)}>{children}</div>
  ),
  SelectTrigger: ({ id, children }: { id?: string; children: React.ReactNode }) => <select id={id}>{children}</select>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <option value="">{placeholder}</option>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => <option value={value}>{children}</option>,
}));

import { ContactDemoForm } from "@/components/landing/ContactDemoForm";

describe("ContactDemoForm user flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInWithOtp.mockResolvedValue({ error: null });
    verifyOtp.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "contact@transcam.cm",
          user_metadata: { demo_verification_pending: true },
        },
        session: { access_token: "verified-token" },
      },
      error: null,
    });
    createEphemeralSupabaseClient.mockReturnValue({ auth: { signInWithOtp, verifyOtp } });
    mutateAsync.mockResolvedValue(undefined);
  });

  it("verifie l'email puis soumet toutes les informations client", async () => {
    render(<ContactDemoForm />);

    fireEvent.change(screen.getByLabelText("Nom complet *"), { target: { value: "Jean Dupont" } });
    fireEvent.change(screen.getByLabelText("Entreprise *"), { target: { value: "TransCam" } });
    fireEvent.change(screen.getByLabelText("Adresse mail *"), { target: { value: "contact@transcam.cm" } });
    fireEvent.change(screen.getByLabelText("Téléphone *"), { target: { value: "+237 600 000 000" } });
    fireEvent.change(screen.getByLabelText("Numéro d'identifiant entreprise *"), { target: { value: "RCCM-DLA-2026-B-123" } });
    fireEvent.change(screen.getByLabelText("Pays *"), { target: { value: "CM" } });

    fireEvent.click(screen.getByRole("button", { name: "Vérifier" }));
    await waitFor(() => expect(signInWithOtp).toHaveBeenCalledWith(expect.objectContaining({ email: "contact@transcam.cm" })));

    fireEvent.change(await screen.findByLabelText("Code de vérification E-Samba *"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Valider le code" }));

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
    expect(await screen.findByText("Demande envoyée !")).toBeInTheDocument();
  });

  it("affiche une erreur utilisateur quand l'environnement Supabase n'est pas synchronise", async () => {
    mutateAsync.mockRejectedValue(new Error("Le service de demande de démo n'est pas encore configuré sur cet environnement. Réessayez plus tard."));
    render(<ContactDemoForm />);

    fireEvent.change(screen.getByLabelText("Nom complet *"), { target: { value: "Jean Dupont" } });
    fireEvent.change(screen.getByLabelText("Entreprise *"), { target: { value: "TransCam" } });
    fireEvent.change(screen.getByLabelText("Adresse mail *"), { target: { value: "contact@transcam.cm" } });
    fireEvent.change(screen.getByLabelText("Téléphone *"), { target: { value: "+237600000000" } });
    fireEvent.change(screen.getByLabelText("Numéro d'identifiant entreprise *"), { target: { value: "RCCM-123" } });
    fireEvent.change(screen.getByLabelText("Pays *"), { target: { value: "CM" } });
    fireEvent.click(screen.getByRole("button", { name: "Vérifier" }));
    fireEvent.change(await screen.findByLabelText("Code de vérification E-Samba *"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Valider le code" }));
    await screen.findByText("Adresse e-mail vérifiée par E-Samba.");
    fireEvent.click(screen.getByRole("button", { name: "Demander ma démo" }));

    expect(await screen.findByText("Le service de demande de démo n'est pas encore configuré sur cet environnement. Réessayez plus tard.")).toBeInTheDocument();
    expect(screen.queryByText("Demande envoyée !")).not.toBeInTheDocument();
  });
});
