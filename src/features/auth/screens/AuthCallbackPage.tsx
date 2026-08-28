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
 * Une vérification de demande de démo reste strictement dans le parcours public :
 * elle ne passe jamais par /post-login ou /start.
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
      setErrorMessage("Paramètre de vérification manquant. Réessayez depuis l'e-mail.");
      setState("error");
      return;
    }

    let cancelled = false;

    void (async () => {
      const timeout = window.setTimeout(() => {
        if (!cancelled) {
          setErrorMessage("La vérification a pris trop de temps. Demandez un nouveau lien depuis le formulaire de démo.");
          setState("error");
        }
      }, 12_000);

      try {
        // getSession() ne garantit pas l'échange du code PKCE. On échange donc
        // explicitement le ?code= reçu dans le magic link.
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError || !data.session) {
          throw exchangeError ?? new Error("verification_session_missing");
        }
        if (cancelled) return;

        window.clearTimeout(timeout);

        if (demoIntent) {
          if (data.session.user.user_metadata?.demo_verification_pending !== true) {
            await supabase.auth.signOut();
            setErrorMessage("Cette adresse e-mail est déjà associée à un compte E-Samba.");
            setState("error");
            return;
          }

          // Ne jamais aiguiller une vérification commerciale vers le produit.
          navigate(`${ROUTE_PATHS.contact}?demo_email_verified=1`, { replace: true });
          return;
        }

        navigate(ROUTE_PATHS.postLogin, { replace: true });
      } catch (exchangeError) {
        window.clearTimeout(timeout);
        console.error("[auth-callback] code exchange failed:", exchangeError);
        if (!cancelled) {
          setErrorMessage("Le lien de vérification est invalide ou expiré. Demandez un nouveau lien depuis le formulaire.");
          setState("error");
        }
      }
    })();

    return () => {
      cancelled = true;
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
              onClick={() => navigate(ROUTE_PATHS.contact, { replace: true })}
            >
              Retour à la demande de démo
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
          <CardDescription>Validation de votre adresse e-mail.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
