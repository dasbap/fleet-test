import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, ArrowLeft, Mail, Lock, User, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  requestPasswordReset,
  signIn,
  signUp,
  updateCurrentUserPassword,
} from "@/lib/auth-actions";
import { isMockAuthEnabled } from "@/lib/authMode";
import { mapSupabaseErrorToFrench } from "@/lib/mapSupabaseError";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MOBILE_APP_ROLE_LABELS,
  MOBILE_APP_ROLE_ORDER,
  type MobileAppRole,
} from "@/types/mobile-app-role";
import { InvitationCodeInput } from "@/components/auth/InvitationCodeInput";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DEMO_CREDENTIAL_ACCOUNTS,
  DEMO_SHARED_PASSWORD,
} from "@/features/auth/data/demoCredentials";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import {
  getSafePostLoginPath,
  LEGACY_POST_LOGIN_REDIRECT_PARAM,
  POST_LOGIN_NEXT_PARAM,
} from "@/navigation/postLoginRedirect";

/**
 * Page d’authentification E-Samba (connexion, inscription, réinitialisation).
 *
 * Choix d’architecture (inchangé) : la connexion passe par `signIn` dans `@/lib/auth-actions`.
 * `useAuthFlow` sert uniquement à `PostLoginGate` après session établie, pas à la connexion.
 *
 * Redirection « retour » : `?next=` sur `/auth` (voir `getLoginPathPreservingReturn` / garde dashboard),
 * pas `location.state.from`. Après succès : navigation vers `/post-login?next=…` puis décision centralisée.
 */
const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const postLoginTarget = useMemo(
    () =>
      getSafePostLoginPath(searchParams.get(POST_LOGIN_NEXT_PARAM)) ??
      getSafePostLoginPath(searchParams.get(LEGACY_POST_LOGIN_REDIRECT_PARAM)) ??
      ROUTE_PATHS.dashboard,
    [searchParams],
  );
  const { toast } = useToast();
  const [isSignup, setIsSignup] = useState(searchParams.get("mode") === "signup");
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryPasswordConfirm, setRecoveryPasswordConfirm] = useState("");
  const [invitationFleetId, setInvitationFleetId] = useState<string | null>(null);
  const [invitationFleetName, setInvitationFleetName] = useState<string | null>(null);
  const [invitationCode, setInvitationCode] = useState<string | null>(null);
  const [hasUnverifiedCode, setHasUnverifiedCode] = useState(false);
  const [showDemoCredentials, setShowDemoCredentials] = useState(false);
  const [mockLoginRole, setMockLoginRole] = useState<MobileAppRole>("FLEET_MANAGER");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    organization: "",
  });

  const fillDemoCredentials = (email: string) => {
    setFormData((prev) => ({
      ...prev,
      email,
      password: DEMO_SHARED_PASSWORD,
    }));
    setShowDemoCredentials(false);
  };

  // Détecter le retour depuis le lien de réinitialisation (hash type=recovery)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
      setIsRecovery(true);
    }
  }, []);

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = formData.email.trim();
    if (!email) {
      toast({ title: "Email requis", description: "Saisissez votre adresse email.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await requestPasswordReset(
        email,
        `${window.location.origin}/auth`
      );
      if (error) {
        toast({
          title: "Erreur",
          description: error.message === "Email not confirmed" ? "Cet email n'est pas encore confirmé." : error.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      toast({
        title: "Email envoyé",
        description: "Si un compte existe pour cet email, vous recevrez un lien pour réinitialiser votre mot de passe. Vérifiez aussi les spams.",
      });
      setIsForgotPassword(false);
    } catch {
      toast({ title: "Erreur", description: "Impossible d'envoyer l'email.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recoveryPassword.length < 6) {
      toast({ title: "Mot de passe trop court", description: "Utilisez au moins 6 caractères.", variant: "destructive" });
      return;
    }
    if (recoveryPassword !== recoveryPasswordConfirm) {
      toast({ title: "Les mots de passe ne correspondent pas", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await updateCurrentUserPassword(recoveryPassword);
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
        setIsLoading(false);
        return;
      }
      toast({ title: "Mot de passe mis à jour", description: "Vous pouvez vous connecter avec votre nouveau mot de passe." });
      setRecoveryPassword("");
      setRecoveryPasswordConfirm("");
      setIsRecovery(false);
      window.history.replaceState(null, "", window.location.pathname);
      navigate(postLoginTarget);
    } catch {
      toast({ title: "Erreur", description: "Impossible de mettre à jour le mot de passe.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isRecovery) {
      handleRecoverySubmit(e);
      return;
    }
    if (isForgotPassword) {
      handleForgotPasswordSubmit(e);
      return;
    }

    // Prevent submission if there's an unverified invitation code
    if (isSignup && hasUnverifiedCode) {
      toast({
        title: "Code non vérifié",
        description: "Veuillez vérifier votre code d'invitation avant de continuer, ou supprimez-le.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      if (isSignup) {
        const { error } = await signUp(
          formData.email, 
          formData.password, 
          formData.fullName,
          invitationFleetId || undefined,
          invitationCode || undefined
        );
        if (error) {
          toast({
            title: "Erreur d'inscription",
            description: error.message === "User already registered" 
              ? "Un compte existe déjà avec cet email"
              : error.message,
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        toast({
          title: "Compte créé avec succès!",
          description: invitationFleetId 
            ? `Vérifiez votre email. Vous rejoindrez la flotte "${invitationFleetName}".`
            : "Vérifiez votre email pour confirmer votre compte.",
        });
      } else {
        const { error } = await signIn(
          formData.email,
          formData.password,
          isMockAuthEnabled() ? mockLoginRole : undefined,
        );
        if (error) {
          const description =
            error.message === "Invalid login credentials"
              ? "Email ou mot de passe incorrect"
              : mapSupabaseErrorToFrench(error.message);
          toast({
            title: "Erreur de connexion",
            description,
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        toast({
          title: "Connexion réussie!",
          description: "Ouverture de session, préparation de votre espace…",
        });
        navigate(`/post-login?next=${encodeURIComponent(postLoginTarget)}`);
      }
    } catch (err) {
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          {/* Back Link */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l'accueil
          </Link>

          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-heading font-bold text-xl">E-Samba</span>
          </div>

          {/* Header */}
          <h1 className="text-2xl md:text-3xl font-heading font-bold mb-2">
            {isRecovery
              ? "Nouveau mot de passe"
              : isForgotPassword
                ? "Mot de passe oublié"
                : isSignup
                  ? "Créer un compte"
                  : "Bon retour!"}
          </h1>
          <p className="text-muted-foreground mb-8">
            {isRecovery
              ? "Choisissez un nouveau mot de passe pour votre compte"
              : isForgotPassword
                ? "Saisissez votre email pour recevoir un lien de réinitialisation"
                : isSignup
                  ? "Commencez à gérer votre flotte intelligemment"
                  : "Connectez-vous pour accéder à votre tableau de bord"}
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Formulaire récupération (nouveau mot de passe après clic sur le lien email) */}
            {isRecovery && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="recoveryPassword">Nouveau mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="recoveryPassword"
                      type="password"
                      placeholder="••••••••"
                      className="pl-11"
                      value={recoveryPassword}
                      onChange={(e) => setRecoveryPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recoveryPasswordConfirm">Confirmer le mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="recoveryPasswordConfirm"
                      type="password"
                      placeholder="••••••••"
                      className="pl-11"
                      value={recoveryPasswordConfirm}
                      onChange={(e) => setRecoveryPasswordConfirm(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Enregistrement..." : "Définir le mot de passe"}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRecovery(false);
                    window.history.replaceState(null, "", window.location.pathname);
                  }}
                  className="w-full text-sm text-muted-foreground hover:text-primary"
                >
                  Retour à la connexion
                </button>
              </>
            )}

            {/* Formulaire mot de passe oublié (envoi du lien par email) */}
            {!isRecovery && isForgotPassword && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="forgotEmail">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="forgotEmail"
                      type="email"
                      placeholder="vous@exemple.com"
                      className="pl-11"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Envoi..." : "Envoyer le lien de réinitialisation"}
                </Button>
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(false)}
                  className="w-full text-sm text-muted-foreground hover:text-primary"
                >
                  Retour à la connexion
                </button>
              </>
            )}

            {/* Formulaire connexion / inscription */}
            {!isRecovery && !isForgotPassword && (
              <>
            {isSignup && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nom complet</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Jean Dupont"
                      className="pl-11"
                      value={formData.fullName}
                      onChange={(e) =>
                        setFormData({ ...formData, fullName: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organization">Organisation</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="organization"
                      type="text"
                      placeholder="Nom de votre entreprise"
                      className="pl-11"
                      value={formData.organization}
                      onChange={(e) =>
                        setFormData({ ...formData, organization: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
                <InvitationCodeInput
                  onValidCode={(fleetId, fleetName, code) => {
                    setInvitationFleetId(fleetId);
                    setInvitationFleetName(fleetName);
                    setInvitationCode(code);
                    setHasUnverifiedCode(false);
                  }}
                  onClear={() => {
                    setInvitationFleetId(null);
                    setInvitationFleetName(null);
                    setInvitationCode(null);
                    setHasUnverifiedCode(false);
                  }}
                  onStatusChange={setHasUnverifiedCode}
                />
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="vous@exemple.com"
                  className="pl-11"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            {isMockAuthEnabled() && !isSignup && (
              <div className="space-y-2">
                <Label htmlFor="mock-role">Rôle (session démo)</Label>
                <Select
                  value={mockLoginRole}
                  onValueChange={(v) => setMockLoginRole(v as MobileAppRole)}
                >
                  <SelectTrigger id="mock-role" className="w-full">
                    <SelectValue placeholder="Choisir un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOBILE_APP_ROLE_ORDER.map((r) => (
                      <SelectItem key={r} value={r}>
                        {MOBILE_APP_ROLE_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  En mode mock, ce rôle détermine les écrans et permissions (aligné mobile Flotte E-Samba).
                </p>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mot de passe</Label>
                {!isSignup && (
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-sm text-primary hover:underline"
                  >
                    Mot de passe oublié?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-11"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading
                ? "Chargement..."
                : isSignup
                ? "Créer mon compte"
                : "Se connecter"}
            </Button>
              </>
            )}
          </form>

          {/* Toggle (masqué en mode récupération ou mot de passe oublié) */}
          {!isRecovery && !isForgotPassword && (
            <>
              <p className="text-center text-muted-foreground mt-6">
                {isSignup ? "Déjà un compte?" : "Pas encore de compte?"}{" "}
                <button
                  type="button"
                  onClick={() => setIsSignup(!isSignup)}
                  className="text-primary hover:underline font-medium"
                >
                  {isSignup ? "Se connecter" : "S'inscrire"}
                </button>
              </p>

              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowDemoCredentials(true)}
                  className="text-xs text-muted-foreground hover:text-primary underline"
                >
                  Voir les identifiants démo
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Panneau visuel désactivé pour réduire le LCP sur /auth en mobile 3G. */}

      {/* Dialog identifiants démo */}
      <Dialog open={showDemoCredentials} onOpenChange={setShowDemoCredentials}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Identifiants démo</DialogTitle>
            <DialogDescription>
              Comptes de démonstration créés par le script E-Samba. À utiliser uniquement en environnement de test.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">
              <span className="font-semibold">Mot de passe (tous les comptes)&nbsp;:</span>{" "}
              <code className="px-1 py-0.5 rounded bg-muted text-xs">{DEMO_SHARED_PASSWORD}</code>
            </p>
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Rôle</th>
                    <th className="px-3 py-2 text-left font-medium">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {DEMO_CREDENTIAL_ACCOUNTS.map((account, index) => (
                    <tr key={account.email} className={index > 0 ? "border-t" : undefined}>
                      <td className="px-3 py-2">{account.role}</td>
                      <td className="px-3 py-2 font-mono text-xs">
                        <button
                          type="button"
                          onClick={() => fillDemoCredentials(account.email)}
                          className="underline underline-offset-2 hover:text-primary"
                        >
                          {account.email}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              Ne pas utiliser ces identifiants en production. Ils sont réservés aux démonstrations et environnements de test.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;
