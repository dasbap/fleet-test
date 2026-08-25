import { type FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ROUTE_PATHS } from "@/navigation/routePaths";

const MIN_PASSWORD_LENGTH = 8;

type PasswordChangeError = Error & {
  code?: string;
  status?: number;
  weakPassword?: {
    reasons?: string[];
    message?: string;
  };
};

function getPasswordErrorMessage(error: PasswordChangeError): string {
  switch (error.code) {
    case "same_password":
      return "Le nouveau mot de passe doit être différent du mot de passe temporaire.";

    case "weak_password": {
      const reasons = error.weakPassword?.reasons;

      if (reasons?.length) {
        return `Le mot de passe est trop faible : ${reasons.join(", ")}.`;
      }

      return "Le mot de passe est trop faible. Ajoutez des majuscules, minuscules, chiffres et caractères spéciaux.";
    }

    case "reauthentication_needed":
      return "Votre session doit être renouvelée. Déconnectez-vous, reconnectez-vous avec le mot de passe temporaire, puis réessayez.";

    case "session_not_found":
    case "refresh_token_not_found":
      return "Votre session a expiré. Reconnectez-vous avec le mot de passe temporaire.";

    default:
      return error.message || "Impossible de modifier le mot de passe.";
  }
}

export default function SetPasswordPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!user) {
    return <Navigate to={ROUTE_PATHS.login} replace />;
  }

  const mustSetPassword =
    user.app_metadata?.must_set_password === true ||
    user.user_metadata?.must_set_password === true;

  if (!mustSetPassword) {
    return <Navigate to={ROUTE_PATHS.dashboard} replace />;
  }

  const changePasswordAndClearMarker = async () => {
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      throw new Error("Session introuvable.");
    }

    const response = await fetch("/api/auth/clear-password-marker", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ password }),
    });

    const result = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      details?: string;
    };

    if (!response.ok || result.ok !== true) {
      const requestError = new Error(
        result.details ??
          result.error ??
          "Votre mot de passe n'a pas pu être enregistré."
      ) as PasswordChangeError;
      requestError.code = result.error;
      requestError.status = response.status;
      throw requestError;
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(
        `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`
      );
      return;
    }

    if (password !== confirmation) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setIsSubmitting(true);

    try {
      await changePasswordAndClearMarker();

      const { error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError) {
        throw refreshError;
      }

      navigate(ROUTE_PATHS.dashboard, {
        replace: true,
      });
    } catch (submissionError) {
      const authError = submissionError as PasswordChangeError;

      setError(getPasswordErrorMessage(authError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-5 rounded-xl border bg-card p-6 shadow-sm"
      >
        <div>
          <h1 className="text-2xl font-semibold">Créez votre mot de passe</h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Choisissez un mot de passe différent du mot de passe temporaire.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Nouveau mot de passe</Label>

          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="Nouveau mot de passe"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isSubmitting}
            minLength={MIN_PASSWORD_LENGTH}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmation">Confirmer le mot de passe</Label>

          <Input
            id="confirmation"
            type="password"
            autoComplete="new-password"
            placeholder="Confirmer le mot de passe"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            disabled={isSubmitting}
            minLength={MIN_PASSWORD_LENGTH}
            required
          />
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Enregistrement..." : "Créer mon mot de passe"}
        </Button>
      </form>
    </main>
  );
}
