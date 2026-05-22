import { useState } from "react";
import { sendMagicLink } from "@/lib/auth-actions";
import { getAuthRedirectUrl } from "@/features/auth/utils/authRedirects";
import { ROUTE_PATHS } from "@/navigation/routePaths";

type Status = "idle" | "loading" | "success" | "error";

interface UseMagicLinkReturn {
  status: Status;
  errorMessage: string | null;
  send: (email: string) => Promise<void>;
  reset: () => void;
}

/**
 * Gère l'envoi d'un lien magique (connexion sans mot de passe).
 * Redirige vers /auth/callback pour l'échange du code PKCE.
 * Même principe anti-énumération que usePasswordReset.
 */
export function useMagicLink(): UseMagicLinkReturn {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const send = async (email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    setStatus("loading");
    setErrorMessage(null);

    try {
      const redirectTo = getAuthRedirectUrl(ROUTE_PATHS.authCallback);
      const { error } = await sendMagicLink(trimmed, redirectTo);

      if (error) {
        if (import.meta.env.DEV) {
          console.warn("[useMagicLink] error:", error.message);
        }
        if (error.message.toLowerCase().includes("rate") || error.status === 429) {
          setErrorMessage("Trop de tentatives. Réessaie dans quelques minutes.");
          setStatus("error");
          return;
        }
        // Autres erreurs — on affiche quand même "lien envoyé" (anti-énumération).
      }

      setStatus("success");
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error("[useMagicLink] unexpected:", err);
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
