import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type CallbackState = "processing" | "error";

/**
 * Callback Supabase Auth — PKCE (magic link, confirmation email, etc.)
 *
 * Supabase redirige ici avec ?code=XXX après clic sur un lien email.
 * Le client JS échange automatiquement le code contre une session via
 * onAuthStateChange (SIGNED_IN). On attend cet événement, puis on redirige
 * vers /post-login pour l'aiguillage classique (dashboard / onboarding).
 *
 * Timeout de sécurité : si rien ne se passe en 10s → erreur.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<CallbackState>("processing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Erreur transmise par Supabase dans l'URL (lien expiré, déjà utilisé…)
    if (error) {
      const msg =
        errorDescription?.replace(/\+/g, " ") ??
        "Le lien est invalide ou a déjà été utilisé.";
      setErrorMessage(decodeURIComponent(msg));
      setState("error");
      return;
    }

    if (!code) {
      setErrorMessage("Paramètre de connexion manquant. Réessaie depuis l'email.");
      setState("error");
      return;
    }

    // Timeout : si Supabase ne répond pas en 10s.
    const timeout = setTimeout(() => {
      setErrorMessage("La connexion a pris trop de temps. Réessaie depuis l'email.");
      setState("error");
    }, 10_000);

    // Le client Supabase JS v2 échange automatiquement le code PKCE.
    // On force via getSession() pour déclencher l'échange si ce n'est pas encore fait,
    // puis on écoute onAuthStateChange pour confirmer.
    void supabase.auth.getSession();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        clearTimeout(timeout);
        listener.subscription.unsubscribe();
        // Aiguillage centralisé (dashboard / onboarding / start).
        navigate(ROUTE_PATHS.postLogin, { replace: true });
      }
      if (event === "USER_UPDATED" && session) {
        clearTimeout(timeout);
        listener.subscription.unsubscribe();
        navigate(ROUTE_PATHS.postLogin, { replace: true });
      }
    });

    return () => {
      clearTimeout(timeout);
      listener.subscription.unsubscribe();
    };
  }, [navigate, searchParams]);

  if (state === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-destructive mb-2" />
            <CardTitle>Lien invalide</CardTitle>
            <CardDescription>
              {errorMessage ?? "Ce lien n'est plus valide."}
            </CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <Button
              className="w-full"
              variant="outline"
              onClick={() => navigate(ROUTE_PATHS.auth, { replace: true })}
            >
              Retour à la connexion
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary mb-2" />
          <CardTitle>Connexion en cours…</CardTitle>
          <CardDescription>Quelques secondes.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
