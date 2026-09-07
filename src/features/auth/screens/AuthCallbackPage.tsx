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
import type { Session } from "@supabase/supabase-js";

const DEMO_VERIFICATION_DRAFT_KEY = "esamba_demo_verification_draft";
const DEMO_VERIFICATION_INTENT_KEY = "esamba_demo_verification_intent";

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

function mapDemoSubmitError(status: number, error?: string): string {
  if (status === 409 && error === "demo_email_already_used") {
    return "Cette adresse e-mail a déjà été utilisée pour une demande E-Samba.";
  }
  if (status === 409 && error === "email_already_registered") {
    return "Cette adresse e-mail est déjà associée à un compte E-Samba.";
  }
  if (status === 401) {
    return "La confirmation e-mail a expiré. Demandez un nouvel e-mail depuis le formulaire de démo.";
  }
  if (status === 403 && error === "verified_email_mismatch") {
    return "L'adresse confirmée ne correspond pas à celle du formulaire.";
  }
  return "Votre e-mail a été confirmé, mais la demande de démo n'a pas pu être enregistrée. Réessayez depuis le formulaire.";
}

async function resolveCallbackSession(code: string | null): Promise<Session> {
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.session) {
      throw error ?? new Error("verification_session_missing");
    }
    return data.session;
  }

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");

  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error || !data.session) {
      throw error ?? new Error("verification_session_missing");
    }
    return data.session;
  }

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    throw error ?? new Error("verification_session_missing");
  }
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
          setErrorMessage(
            "La confirmation a pris trop de temps. Demandez un nouvel e-mail depuis le formulaire de démo."
          );
          setState("error");
        }
      }, 12_000);

      try {
        const session = await resolveCallbackSession(code);
        if (cancelled) return;

        if (!demoIntent) {
          window.clearTimeout(timeout);
          navigate(ROUTE_PATHS.postLogin, { replace: true });
          return;
        }

        const draft = readDemoDraft();
        if (!draft) {
          await supabase.auth.signOut({ scope: "local" });
          throw new Error("demo_draft_missing");
        }

        if (session.user.user_metadata?.demo_verification_pending !== true) {
          await supabase.auth.signOut({ scope: "local" });
          window.clearTimeout(timeout);
          setErrorMessage("Cette adresse e-mail est déjà associée à un compte E-Samba.");
          setState("error");
          return;
        }

        if (session.user.email?.trim().toLowerCase() !== draft.email.trim().toLowerCase()) {
          await supabase.auth.signOut({ scope: "local" });
          window.clearTimeout(timeout);
          setErrorMessage("L'adresse confirmée ne correspond pas à celle du formulaire.");
          setState("error");
          return;
        }

        const response = await fetch("/api/demo/request", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            full_name: draft.name,
            email: draft.email,
            company: draft.company,
            phone: draft.phone,
            company_identifier: draft.company_identifier,
            country_code: draft.country_code,
          }),
        });

        let body: { ok?: boolean; error?: string } = {};
        try {
          body = (await response.json()) as { ok?: boolean; error?: string };
        } catch {
          body = {};
        }

        await supabase.auth.signOut({ scope: "local" });
        window.clearTimeout(timeout);

        if (!response.ok || body.ok !== true) {
          window.localStorage.removeItem(DEMO_VERIFICATION_INTENT_KEY);
          setErrorMessage(mapDemoSubmitError(response.status, body.error));
          setState("error");
          return;
        }

        window.localStorage.removeItem(DEMO_VERIFICATION_DRAFT_KEY);
        window.localStorage.removeItem(DEMO_VERIFICATION_INTENT_KEY);
        navigate(`${ROUTE_PATHS.contact}?demo_request_sent=1`, { replace: true });
      } catch (callbackError) {
        window.clearTimeout(timeout);
        console.error("[auth-callback] confirmation failed:", callbackError);
        if (!cancelled) {
          const message =
            callbackError instanceof Error &&
            callbackError.message === "demo_draft_missing"
              ? "Les informations de votre demande ne sont plus disponibles dans ce navigateur. Revenez au formulaire et recommencez la confirmation."
              : "Le lien de confirmation est invalide ou expiré. Demandez un nouvel e-mail depuis le formulaire.";
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
            <CardTitle>Confirmation impossible</CardTitle>
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
          <CardTitle>Confirmation en cours…</CardTitle>
          <CardDescription>
            Confirmation de votre e-mail et envoi de votre demande de démo.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
