import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Truck, ArrowLeft, Mail, Lock, User, Building2, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
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
} from "@/features/auth/data/demoCredentials";
import {
  DEMO_QUICK_ACCOUNTS,
  DEMO_QUICK_ROLE_COLORS,
} from "@/features/auth/data/demoQuickAccess";
import { buildAuthHref, isAuthSignupMode } from "@/navigation/authEntryUrl";
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
// true en production (build Vite) — élimine les blocs démo par tree-shaking
const IS_PROD = import.meta.env.PROD;

// Mot de passe partagé pour les sessions démo locales/staging.
// À définir dans .env.development uniquement, JAMAIS committé.
// Ce bloc est dead-code en production (IS_PROD = true → tree-shaken par Vite).
const DEMO_DEV_PASSWORD = !IS_PROD
  ? (import.meta.env.VITE_DEMO_PASSWORD as string | undefined) ?? ""
  : "";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isSignup = isAuthSignupMode(searchParams);
  const postLoginTarget = useMemo(
    () =>
      getSafePostLoginPath(searchParams.get(POST_LOGIN_NEXT_PARAM)) ??
      getSafePostLoginPath(searchParams.get(LEGACY_POST_LOGIN_REDIRECT_PARAM)) ??
      ROUTE_PATHS.dashboard,
    [searchParams],
  );

  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
      password: DEMO_DEV_PASSWORD,
    }));
    setShowDemoCredentials(false);
  };

  /** Connexion démo rapide — uniquement en dev/staging (IS_PROD = false). */
  const handleDemoQuickLogin = async (demoEmail: string) => {
    // Guard : ne jamais s'exécuter en production (Vite élimine ce bloc)
    if (IS_PROD) return;
    setIsLoading(true);
    setFormData((prev) => ({
      ...prev,
      email: demoEmail,
      password: DEMO_DEV_PASSWORD,
    }));
    try {
      const { error } = await signIn(
        demoEmail,
        DEMO_DEV_PASSWORD,
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
    } catch {
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite",
        variant: "destructive",
      });
    }
    setIsLoading(false);
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
    <div className="min-h-screen bg-surface-overlay flex">
      {/* Colonne gauche — branding (desktop uniquement, LCP léger sur mobile) */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 max-w-xl bg-surface p-12 border-r border-border/50">
        <div className="flex items-center gap-3">
          <Truck className="w-8 h-8 text-brand" aria-hidden />
          <span className="text-xl font-heading font-semibold text-foreground">E-Samba</span>
        </div>
        <div>
          <blockquote className="text-2xl font-heading font-medium text-foreground leading-relaxed">
            « Gérez votre flotte intelligemment,
            <br />
            où que vous soyez en Afrique Centrale. »
          </blockquote>
          <p className="mt-4 text-sm text-muted-foreground">
            Suivi temps réel · Alertes automatiques · Rapports XAF
          </p>
        </div>
        <p className="text-xs text-muted-foreground">© 2026 E-Samba · Douala, Cameroun</p>
      </div>

      {/* Colonne formulaire */}
      <div className="flex-1 flex flex-col justify-center bg-background px-8 py-12 lg:px-16">
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
              <Truck className="w-6 h-6 text-primary-foreground" aria-hidden />
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

            {!IS_PROD && isMockAuthEnabled() && !isSignup && (
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
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={isSignup ? "Minimum 8 caractères" : "••••••••"}
                  className="pl-11 pr-11"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  minLength={isSignup ? 8 : undefined}
                  autoComplete={isSignup ? "new-password" : "current-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  tabIndex={-1}
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
              disabled={isLoading}
            >
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
                {isSignup ? "Déjà un compte ? " : "Pas encore de compte ? "}
                {isSignup ? (
                  <Link
                    to={buildAuthHref(searchParams, false)}
                    className="text-primary hover:underline font-medium"
                  >
                    Se connecter
                  </Link>
                ) : (
                  <Link
                    to={buildAuthHref(searchParams, true)}
                    className="text-primary hover:underline font-medium"
                  >
                    Démarrer gratuitement
                  </Link>
                )}
              </p>

              {/* Accès démo rapide — uniquement en dev/staging, tree-shaken en production */}
              {!IS_PROD && !isSignup && (
                <>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-8">
                    <div className="flex-1 h-px bg-border" />
                    <span>ou accès démo</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <div className="space-y-2 mt-4">
                    {DEMO_QUICK_ACCOUNTS.map((account, index) => (
                      <button
                        key={account.email}
                        type="button"
                        onClick={() => void handleDemoQuickLogin(account.email)}
                        disabled={isLoading}
                        className={cn(
                          "w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-border",
                          "bg-card hover:bg-surface-raised text-sm transition-colors",
                          "disabled:opacity-50 disabled:pointer-events-none",
                        )}
                      >
                        <span className="font-medium">
                          Démo{" "}
                          <span className={DEMO_QUICK_ROLE_COLORS[index] ?? "text-muted-foreground"}>
                            {account.role}
                          </span>
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {account.email.split("@")[0]}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setShowDemoCredentials(true)}
                      className="text-xs text-muted-foreground hover:text-primary underline"
                    >
                      Voir tous les identifiants démo
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Dialog identifiants démo — tree-shaken en production */}
      {!IS_PROD && (
        <Dialog open={showDemoCredentials} onOpenChange={setShowDemoCredentials}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Identifiants démo</DialogTitle>
              <DialogDescription>
                Comptes de démonstration — environnement dev/staging uniquement.
                Mot de passe via <code className="text-xs">VITE_DEMO_PASSWORD</code> dans <code className="text-xs">.env.development</code>.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
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
                Ces comptes sont soumis aux restrictions démo (RLS, sessions limitées, billing masqué).
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Auth;
