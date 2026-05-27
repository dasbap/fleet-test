import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Loader2, Lock } from "lucide-react";

const MIN_LENGTH = 8;

type PageState = "verifying" | "ready" | "error" | "success";

/**
 * Page reset-password — compatible flow PKCE Supabase (token_hash dans l'URL)
 * et flow legacy (event PASSWORD_RECOVERY via hash fragment).
 *
 * Flow PKCE (Supabase Auth v2 PKCE) :
 *   URL : /auth/update-password?token_hash=XXX&type=recovery
 *   → appel verifyOtp() pour établir la session recovery
 *   → affichage du formulaire
 *
 * Flow implicite (event PASSWORD_RECOVERY) :
 *   → isPasswordRecovery=true depuis AuthProvider
 *   → affichage direct du formulaire
 */
export default function UpdatePasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isPasswordRecovery, memberships } = useAuth();

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const [pageState, setPageState] = useState<PageState>(() => {
    // Si token_hash présent dans l'URL → flow PKCE, on doit vérifier d'abord.
    if (tokenHash && type === "recovery") return "verifying";
    // Sinon si déjà en mode recovery (event hash fragment) → formulaire direct.
    if (isPasswordRecovery) return "ready";
    // Accès direct sans contexte valide.
    return "error";
  });

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Éviter double-appel en StrictMode (React 18).
  const verifyCalledRef = useRef(false);

  // ── Échange du token PKCE pour établir la session recovery ─────────────────
  useEffect(() => {
    if (pageState !== "verifying") return;
    if (!tokenHash || type !== "recovery") {
      setPageState("error");
      return;
    }
    if (verifyCalledRef.current) return;
    verifyCalledRef.current = true;

    void (async () => {
      try {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });

        if (error) {
          console.error("[UpdatePassword] verifyOtp error:", error.message);
          setVerifyError(
            error.message.includes("expired")
              ? "Ce lien a expiré. Faites une nouvelle demande de réinitialisation."
              : "Lien invalide ou déjà utilisé. Faites une nouvelle demande."
          );
          setPageState("error");
        } else {
          // Session établie → AuthProvider reçoit PASSWORD_RECOVERY event et
          // met isPasswordRecovery=true. On peut afficher le formulaire.
          setPageState("ready");
        }
      } catch (err) {
        console.error("[UpdatePassword] verifyOtp unexpected error:", err);
        setVerifyError("Erreur inattendue. Réessaie depuis l'email.");
        setPageState("error");
      }
    })();
  }, [pageState, tokenHash, type]);

  // ── Si event PASSWORD_RECOVERY arrive après le mount initial ───────────────
  useEffect(() => {
    if (isPasswordRecovery && pageState === "error") {
      setPageState("ready");
    }
  }, [isPasswordRecovery, pageState]);

  // ── Soumission du nouveau mot de passe ─────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (password.length < MIN_LENGTH) {
      setFormError(`Le mot de passe doit contenir au moins ${MIN_LENGTH} caractères.`);
      return;
    }
    if (password !== confirm) {
      setFormError("Les mots de passe ne correspondent pas.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setFormError(error.message);
        return;
      }

      setPageState("success");

      // Redirection après 2s : dashboard si flotte existante, sinon /start.
      setTimeout(() => {
        const dest =
          memberships.length > 0 ? ROUTE_PATHS.dashboard : ROUTE_PATHS.tenantBootstrap;
        navigate(dest, { replace: true });
      }, 2000);
    } catch (err) {
      console.error("[UpdatePassword] updateUser error:", err);
      setFormError("Erreur réseau. Vérifie ta connexion et réessaie.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Rendus selon l'état ─────────────────────────────────────────────────────

  if (pageState === "verifying") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary mb-2" />
            <CardTitle>Vérification du lien…</CardTitle>
            <CardDescription>Quelques secondes.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (pageState === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-destructive mb-2" />
            <CardTitle>Lien invalide ou expiré</CardTitle>
            <CardDescription>
              {verifyError ??
                "Ce lien de réinitialisation n'est plus valide. Faites une nouvelle demande depuis la page de connexion."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => navigate(ROUTE_PATHS.auth, { replace: true })}
            >
              Retour à la connexion
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pageState === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-green-500 mb-2" />
            <CardTitle>Mot de passe mis à jour</CardTitle>
            <CardDescription>
              Votre mot de passe a été modifié. Redirection en cours…
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // pageState === "ready" — formulaire
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Lock className="mx-auto h-10 w-10 text-primary mb-2" />
          <CardTitle>Nouveau mot de passe</CardTitle>
          <CardDescription>
            Choisissez un mot de passe sécurisé pour votre compte E-Samba.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="Au moins 8 caractères"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={MIN_LENGTH}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmer le mot de passe</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                placeholder="Répète le mot de passe"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={MIN_LENGTH}
                disabled={isSubmitting}
              />
            </div>

            {formError && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mise à jour…
                </>
              ) : (
                "Mettre à jour le mot de passe"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
