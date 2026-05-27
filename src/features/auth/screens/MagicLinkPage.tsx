import { useState } from "react";
import { Link } from "react-router-dom";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { useMagicLink } from "@/features/auth/hooks/useMagicLink";
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
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Mail, Zap } from "lucide-react";

/**
 * Connexion sans mot de passe via lien magique (OTP email).
 * Accessible via /auth/magic-link — wrappée dans RequireGuest.
 * Redirige vers /auth/callback après clic dans l'email (PKCE).
 */
export default function MagicLinkPage() {
  const [email, setEmail] = useState("");
  const { status, errorMessage, send, reset } = useMagicLink();

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
            <CardTitle>Lien envoyé !</CardTitle>
            <CardDescription>
              Un lien de connexion a été envoyé à <strong>{email}</strong>.
              Clique dessus pour accéder à ton compte. Vérifie aussi les spams.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                reset();
                setEmail("");
              }}
            >
              Utiliser une autre adresse
            </Button>
            <Link to={ROUTE_PATHS.auth}>
              <Button variant="ghost" className="w-full text-muted-foreground">
                Connexion avec mot de passe
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
            Connexion classique
          </Link>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <CardTitle>Connexion sans mot de passe</CardTitle>
          </div>
          <CardDescription>
            Saisis ton email et reçois un lien de connexion instantané —
            aucun mot de passe à retenir.
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
                "Recevoir mon lien de connexion"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
