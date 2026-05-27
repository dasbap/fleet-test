import { useState } from "react";
import { requestPasswordReset } from "@/lib/auth-actions";
import { getAuthRedirectUrl } from "@/features/auth/utils/authRedirects";
import { ROUTE_PATHS } from "@/navigation/routePaths";

type Status = "idle" | "loading" | "success" | "error";

interface UsePasswordResetReturn {
  status: Status;
  errorMessage: string | null;
  send: (email: string) => Promise<void>;
  reset: () => void;
}

/**
 * Gère l'envoi du lien de réinitialisation mot de passe.
 * Ne révèle jamais si l'email existe — affiche toujours "email envoyé".
 */
export function usePasswordReset(): UsePasswordResetReturn {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const send = async (email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    setStatus("loading");
    setErrorMessage(null);

    try {
      const redirectTo = getAuthRedirectUrl(ROUTE_PATHS.updatePassword);
      const { error } = await requestPasswordReset(trimmed, redirectTo);

      if (error) {
        // Ne pas distinguer "email inconnu" / erreur réseau — sécurité anti-énumération.
        // Log côté développeur uniquement.
        if (import.meta.env.DEV) {
          console.warn("[usePasswordReset] error:", error.message);
        }
        // Seul cas où on remonte une erreur visible : quota Supabase (rate limit).
        if (error.message.toLowerCase().includes("rate") || error.status === 429) {
          setErrorMessage("Trop de tentatives. Réessaie dans quelques minutes.");
          setStatus("error");
          return;
        }
      }

      // Succès ou email inexistant — on affiche toujours "email envoyé".
      setStatus("success");
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error("[usePasswordReset] unexpected:", err);
      }
      setErrorMessage("Erreur réseau. Vérifie ta connexion et réessaie.");
      setStatus("error");
    }
  };

  const reset = () => {
    setStatus("idle");
    setErrorMessage(null);
  };

  return { status, errorMessage, send, reset };
}
