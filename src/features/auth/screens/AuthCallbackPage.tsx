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

const DEMO_VERIFICATION_INTENT_KEY = "esamba_demo_verification_intent";

type CallbackState = "processing" | "error";

/**
 * Callback Supabase Auth — PKCE (magic link, confirmation email, etc.).
 * Les magic links de vérification d'une demande de démo reviennent sur /contact
 * au lieu d'entrer dans l'aiguillage produit /post-login.
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
    const demoIntent =
      searchParams.get("intent") === "demo" ||
      window.localStorage.getItem(DEMO_VERIFICATION_INTENT_KEY) === "demo";

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

    const timeout = setTimeout(() => {
      setErrorMessage("La connexion a pris trop de temps. Réessaie depuis l'email.");
      setState("error");
    }, 10_000);

    void supabase.auth.getSession();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session) {
        clearTimeout(timeout);
        listener.subscription.unsubscribe();

        if (demoIntent && session.user.user_metadata?.demo_verification_pending === true) {
          navigate(`${ROUTE_PATHS.contact}?demo_email_verified=1`, { replace: true });
          return;
        }

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
          <CardTitle>Vérification en cours…</CardTitle>
          <CardDescription>Quelques secondes.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
