import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, ArrowLeft, Mail, Lock, User, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { signIn, signUp, useAuth } from "@/hooks/useAuth";
import { InvitationCodeInput } from "@/components/auth/InvitationCodeInput";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const [isSignup, setIsSignup] = useState(searchParams.get("mode") === "signup");
  const [isLoading, setIsLoading] = useState(false);
  const [invitationFleetId, setInvitationFleetId] = useState<string | null>(null);
  const [invitationFleetName, setInvitationFleetName] = useState<string | null>(null);
  const [invitationCode, setInvitationCode] = useState<string | null>(null);
  const [hasUnverifiedCode, setHasUnverifiedCode] = useState(false);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    organization: "",
  });

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      navigate("/dashboard");
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          toast({
            title: "Erreur de connexion",
            description: error.message === "Invalid login credentials"
              ? "Email ou mot de passe incorrect"
              : error.message,
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        toast({
          title: "Connexion réussie!",
          description: "Redirection vers le tableau de bord...",
        });
        navigate("/dashboard");
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
            {isSignup ? "Créer un compte" : "Bon retour!"}
          </h1>
          <p className="text-muted-foreground mb-8">
            {isSignup
              ? "Commencez à gérer votre flotte intelligemment"
              : "Connectez-vous pour accéder à votre tableau de bord"}
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mot de passe</Label>
                {!isSignup && (
                  <a
                    href="#"
                    className="text-sm text-primary hover:underline"
                  >
                    Mot de passe oublié?
                  </a>
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
          </form>

          {/* Toggle */}
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
        </div>
      </div>

      {/* Right Panel - Visual */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary/20 via-background to-accent/10 items-center justify-center p-12">
        <div className="max-w-lg text-center">
          <div className="w-24 h-24 mx-auto mb-8 rounded-2xl bg-primary/20 flex items-center justify-center">
            <Zap className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-3xl font-heading font-bold mb-4">
            Smart Mobility Africa
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Rejoignez des centaines de gestionnaires de flottes qui optimisent
            leurs opérations quotidiennes avec E-Samba.
          </p>
          <div className="mt-8 flex items-center justify-center gap-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">500+</div>
              <div className="text-sm text-muted-foreground">Véhicules</div>
            </div>
            <div className="w-px h-12 bg-border" />
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">50+</div>
              <div className="text-sm text-muted-foreground">Flottes</div>
            </div>
            <div className="w-px h-12 bg-border" />
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">98%</div>
              <div className="text-sm text-muted-foreground">Uptime</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
