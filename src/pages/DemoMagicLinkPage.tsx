/**
 * DemoMagicLinkPage — page d'atterrissage pour les magic links démo.
 *
 * Route : /demo/access?token=<UUID>
 *
 * Flow :
 *   1. Lit le token dans l'URL
 *   2. Appelle Edge Function demo-magic-link (action: validate)
 *   3. Reçoit un magic_link (Supabase OTP URL) + fleet_id
 *   4. Redirige vers le magic_link → Supabase Auth complète l'auth
 *   5. Post-auth : redirige vers /demo/onboarding
 *
 * Gestion d'erreurs : token invalide, expiré, déjà utilisé.
 */

import { useEffect, useRef, useState } from "react";
import { useSearchParams, Navigate } from "react-router-dom";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = "loading" | "success" | "error";

interface ValidateResponse {
  ok:         boolean;
  magic_link?: string;
  error?:     string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

// ─── Composant ────────────────────────────────────────────────────────────────

export default function DemoMagicLinkPage() {
  const [searchParams]  = useSearchParams();
  const token           = searchParams.get("token") ?? "";

  const [status,  setStatus]  = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const hasCalled = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Lien invalide — paramètre token manquant.");
      return;
    }

    // Évite le double appel en React StrictMode
    if (hasCalled.current) return;
    hasCalled.current = true;

    void validateToken(token);
  }, [token]);

  async function validateToken(tok: string) {
    if (!SUPABASE_URL) {
      setStatus("error");
      setMessage("Configuration manquante.");
      return;
    }

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/demo-magic-link`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "validate", token: tok }),
      });

      const data = await res.json() as ValidateResponse;

      if (!data.ok || !data.magic_link) {
        setStatus("error");
        setMessage(
          data.error === "token_expired"   ? "Ce lien a expiré. Demande un nouveau lien à ton commercial." :
          data.error === "token_not_found" ? "Lien introuvable ou déjà utilisé." :
          data.error === "account_inactive"? "Compte démo désactivé. Contacte l'équipe E-Samba." :
          "Lien invalide. Contacte l'équipe E-Samba.",
        );
        return;
      }

      setStatus("success");
      setMessage("Connexion en cours…");

      // Redirige vers le magic link Supabase Auth (OTP)
      window.location.href = data.magic_link;

    } catch {
      setStatus("error");
      setMessage("Erreur de connexion. Réessaie dans quelques secondes.");
    }
  }

  // ── Pas de token : redirection immédiate ──────────────────────────────────

  if (!token) {
    return <Navigate to="/auth" replace />;
  }

  // ── UI ─────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 text-center">

        {/* Logo */}
        <div className="flex justify-center">
          <img
            src="/logo.svg"
            alt="E-Samba"
            className="h-10 w-auto"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>

        {/* État loading */}
        {status === "loading" && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <div>
              <p className="font-semibold text-lg">Vérification de ton accès…</p>
              <p className="text-sm text-muted-foreground mt-1">
                Tu seras connecté automatiquement dans quelques secondes.
              </p>
            </div>
          </>
        )}

        {/* État success (transition vers auth) */}
        {status === "success" && (
          <>
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
            <div>
              <p className="font-semibold text-lg">Accès validé ✓</p>
              <p className="text-sm text-muted-foreground mt-1">{message}</p>
            </div>
          </>
        )}

        {/* État erreur */}
        {status === "error" && (
          <>
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-left space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-destructive text-sm">Accès refusé</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{message}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                variant="default"
                className="w-full"
                onClick={() => { hasCalled.current = false; void validateToken(token); }}
              >
                Réessayer
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => window.location.href = "mailto:contact@e-samba.com"}
              >
                Contacter le support
              </Button>
            </div>
          </>
        )}

        <p className="text-xs text-muted-foreground">
          Propulsé par{" "}
          <span className="font-semibold text-foreground">E-Samba</span> —
          Gestion de flotte pour l'Afrique
        </p>
      </div>
    </div>
  );
}
