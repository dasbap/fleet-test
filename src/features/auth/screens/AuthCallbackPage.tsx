import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
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

const DEMO_VERIFICATION_DRAFT_KEY = "esamba_demo_verification_draft";
const DEMO_VERIFICATION_INTENT_KEY = "esamba_demo_verification_intent";
const DEMO_VERIFICATION_EMAIL_STATE_KEY = "esamba_demo_verification_email_state";

type CallbackState = "processing" | "error";

type DemoVerificationDraft = {
  name: string;
  email: string;
  company: string;
  phone: string;
  company_identifier: string;
  country_code: string;
};

function readDemoDraft(): DemoVerificationDraft | null {
  try {
    const raw = window.localStorage.getItem(DEMO_VERIFICATION_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DemoVerificationDraft>;
    if (
      !parsed.name?.trim() ||
      !parsed.email?.trim() ||
      !parsed.company?.trim() ||
      !parsed.phone?.trim() ||
      !parsed.company_identifier?.trim() ||
      !parsed.country_code?.trim()
    ) {
      return null;
    }
    return {
      name: parsed.name,
      email: parsed.email,
      company: parsed.company,
      phone: parsed.phone,
      company_identifier: parsed.company_identifier,
      country_code: parsed.country_code,
    };
  } catch {
    return null;
  }
}

async function resolveCallbackSession(code: string | null): Promise<Session | null> {
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session) return data.session;
  }

  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");
  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (!error && data.session) return data.session;
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session;
}

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

    let cancelled = false;

    void (async () => {
      const timeout = window.setTimeout(() => {
        if (!cancelled) {
          setErrorMessage("La vérification a pris trop de temps. Demandez un nouveau lien depuis le formulaire de démo.");
          setState("error");
        }
      }, 12_000);

      try {
        const session = await resolveCallbackSession(code);
        if (!session?.user?.email || !session.user.email_confirmed_at) {
          throw new Error("verification_session_missing");
        }
        if (cancelled) return;

        if (!demoIntent) {
          window.clearTimeout(timeout);
          navigate(ROUTE_PATHS.postLogin, { replace: true });
          return;
        }

        const draft = readDemoDraft();
        if (!draft) {
          throw new Error("demo_draft_missing");
        }

        if (session.user.email.toLowerCase() !== draft.email.trim().toLowerCase()) {
          throw new Error("demo_email_mismatch");
        }

        if (session.user.user_metadata?.demo_verification_pending !== true) {
          window.clearTimeout(timeout);
          setErrorMessage("Cette adresse e-mail est déjà associée à un compte E-Samba.");
          setState("error");
          return;
        }

        window.localStorage.setItem(DEMO_VERIFICATION_EMAIL_STATE_KEY, "verified");
        window.clearTimeout(timeout);
        navigate(`${ROUTE_PATHS.contact}?demo_email_verified=1`, { replace: true });
      } catch (callbackError) {
        window.clearTimeout(timeout);
        console.error("[auth-callback] verification failed:", callbackError);
        if (!cancelled) {
          const message =
            callbackError instanceof Error && callbackError.message === "demo_draft_missing"
              ? "Les informations de votre demande ne sont plus disponibles dans ce navigateur. Revenez au formulaire et recommencez la vérification."
              : callbackError instanceof Error && callbackError.message === "demo_email_mismatch"
                ? "L'adresse vérifiée ne correspond pas à celle du formulaire de démo."
                : "Le lien de vérification est invalide ou expiré. Demandez un nouveau lien depuis le formulaire.";
          setErrorMessage(message);
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
            <CardTitle>Vérification impossible</CardTitle>
            <CardDescription>{errorMessage ?? "Ce lien n'est plus valide."}</CardDescription>
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
          <CardDescription>Validation de votre adresse e-mail dans Supabase puis retour vers votre demande de démo.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}