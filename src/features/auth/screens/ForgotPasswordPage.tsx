import { useState } from "react";
import { Link } from "react-router-dom";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { usePasswordReset } from "@/features/auth/hooks/usePasswordReset";
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
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";

/**
 * Page standalone "Mot de passe oublié".
 * Accessible via /auth/forgot-password — wrappée dans RequireGuest.
 * Envoie un lien de réinitialisation pointant vers /auth/update-password (PKCE).
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const { status, errorMessage, send } = usePasswordReset();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await send(email);
  };

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-green-500 mb-2" />
            <CardTitle>Email envoyé</CardTitle>
            <CardDescription>
              Si un compte existe pour <strong>{email}</strong>, tu recevras
              un lien de réinitialisation dans quelques minutes. Vérifie aussi
              les spams.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to={ROUTE_PATHS.auth}>
              <Button variant="outline" className="w-full">
                Retour à la connexion
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Link
            to={ROUTE_PATHS.auth}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Connexion
          </Link>
          <CardTitle>Mot de passe oublié</CardTitle>
          <CardDescription>
            Saisis ton adresse email et nous t'enverrons un lien pour
            réinitialiser ton mot de passe.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Adresse email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="toi@exemple.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={status === "loading"}
                />
              </div>
            </div>

            {errorMessage && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={status === "loading"}>
              {status === "loading" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi en cours…
                </>
              ) : (
                "Envoyer le lien de réinitialisation"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
