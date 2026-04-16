import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useEsambaDataVerification } from "@/hooks/useEsambaDataVerification";
import { useFleetMembers, type FleetMember } from "@/hooks/useFleetMembers";
import { useSeedEsambaData } from "@/hooks/useSeedEsambaData";
import { PageLoader } from "@/components/dashboard/PageLoader";
import {
  ESAMBA_DEMO_FLEET_NAME,
  ESAMBA_DEMO_INVITATION_CODE,
  ESAMBA_DEMO_ORG_NAME,
  ESAMBA_DEMO_VEHICLE_REGISTRATION,
} from "@/constants/esamba-demo.constants";
import { Settings as SettingsIcon, Zap, CheckCircle2, XCircle, RefreshCw, Users, Shield, UserCog, Car, Wrench, Phone, Loader2, Languages } from "lucide-react";
import { BiometricLockSettingsCard } from "@/components/mobile/BiometricLockSettingsCard";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { recommendTutorialOfflineQuota } from "@/lib/tutorialOfflineQuotaRecommendation";

const Settings = () => {
  const { t } = useTranslation("common");
  const { user, userFleetId, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: verificationStatus, isLoading: isVerifying, refetch: refetchVerification } = useEsambaDataVerification();
  const { data: fleetMembers = [], isLoading: isLoadingMembers, error: membersError, refetch: refetchMembers } = useFleetMembers(userFleetId || undefined);
  const seedMutation = useSeedEsambaData();
  const offlineQuotaRecommendation = useMemo(
    () => recommendTutorialOfflineQuota(),
    [],
  );
  const envOfflineQuotaMb = Number(import.meta.env.VITE_TUTORIAL_OFFLINE_QUOTA_MB);
  const effectiveEnvOfflineQuotaMb = Number.isFinite(envOfflineQuotaMb)
    ? envOfflineQuotaMb
    : 250;

  const handleCopyRecommendedQuota = async () => {
    const envLine = `VITE_TUTORIAL_OFFLINE_QUOTA_MB=${offlineQuotaRecommendation.recommendedQuotaMb}`;
    try {
      await navigator.clipboard.writeText(envLine);
      toast({
        title: "Valeur copiée",
        description: `${envLine} a été copié dans le presse-papiers.`,
      });
    } catch {
      toast({
        title: "Copie impossible",
        description: "La copie automatique a échoué. Copiez la valeur manuellement.",
        variant: "destructive",
      });
    }
  };

  // Note: L'exécution automatique a été désactivée pour éviter les problèmes
  // L'utilisateur doit cliquer manuellement sur le bouton de création des données de démo (code invitation défini dans esamba-demo.constants).

  // Fonctions helper pour les rôles
  const getRoleLabel = (role: string) => {
    switch (role) {
      case "organizer":
        return "Organisateur";
      case "manager":
        return "Gestionnaire";
      case "driver":
        return "Chauffeur";
      case "mechanic":
        return "Mécanicien";
      default:
        return role;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "organizer":
        return <Shield className="h-4 w-4" />;
      case "manager":
        return <UserCog className="h-4 w-4" />;
      case "driver":
        return <Car className="h-4 w-4" />;
      case "mechanic":
        return <Wrench className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "organizer":
        return "default";
      case "manager":
        return "secondary";
      case "driver":
        return "outline";
      case "mechanic":
        return "outline";
      default:
        return "outline";
    }
  };

  // Grouper les membres par user_id pour afficher tous leurs rôles
  const groupedMembers = useMemo(() => {
    const grouped = new Map<string, { profile: FleetMember['profile']; roles: Array<{ role: string; is_active: boolean; id: string }> }>();
    
    fleetMembers.forEach((member) => {
      if (!grouped.has(member.user_id)) {
        grouped.set(member.user_id, {
          profile: member.profile,
          roles: [],
        });
      }
      const userData = grouped.get(member.user_id)!;
      userData.roles.push({
        role: member.role,
        is_active: member.is_active,
        id: member.id,
      });
    });
    
    return Array.from(grouped.entries()).map(([user_id, data]) => ({
      user_id,
      ...data,
    }));
  }, [fleetMembers]);

  if (authLoading || !user) {
    return <PageLoader />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl md:text-3xl font-heading font-bold flex items-center gap-2">
                    <SettingsIcon className="h-7 w-7" />
                    {t("settingsPage.title")}
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    {t("settingsPage.description")}
                  </p>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Languages className="h-5 w-5" />
                    {t("settingsPage.languageSectionTitle")}
                  </CardTitle>
                  <CardDescription>{t("settingsPage.languageSectionDescription")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <LanguageSwitcher />
                </CardContent>
              </Card>

              <BiometricLockSettingsCard />

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quota offline tutoriels (suggestion)</CardTitle>
                  <CardDescription>
                    Détection automatique du profil appareil pour proposer une valeur recommandée.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    Profil détecté: <strong>{offlineQuotaRecommendation.tier}</strong>
                  </p>
                  <p>
                    Quota recommandé: <strong>{offlineQuotaRecommendation.recommendedQuotaMb} MB</strong>
                  </p>
                  <p>
                    Quota configuré via environnement: <strong>{effectiveEnvOfflineQuotaMb} MB</strong>
                  </p>
                  <p className="text-muted-foreground">{offlineQuotaRecommendation.rationale}</p>
                  <p className="text-xs text-muted-foreground">
                    Pour appliquer la recommandation, modifiez <code>VITE_TUTORIAL_OFFLINE_QUOTA_MB</code> dans votre
                    fichier d’environnement.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleCopyRecommendedQuota()}
                  >
                    Copier la valeur recommandée
                  </Button>
                </CardContent>
              </Card>

              {/* Carte de seed ESAMBA */}
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    Données de démo ESAMBA
                  </CardTitle>
                  <CardDescription>
                    Crée automatiquement une organisation, une flotte, un véhicule et une invitation
                    <span className="font-mono font-semibold"> {ESAMBA_DEMO_INVITATION_CODE}</span> dans votre base.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <AlertTitle>Ce que fait ce bouton</AlertTitle>
                    <AlertDescription>
                      - Crée <strong>{ESAMBA_DEMO_ORG_NAME}</strong> et <strong>{ESAMBA_DEMO_FLEET_NAME}</strong>
                      <br />
                      - Vous ajoute comme <strong>organisateur</strong> de cette flotte
                      <br />
                      - Ajoute un véhicule <strong>{ESAMBA_DEMO_VEHICLE_REGISTRATION}</strong>
                      <br />
                      - Crée l&apos;invitation <strong>{ESAMBA_DEMO_INVITATION_CODE}</strong>
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    {seedMutation.isPending && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                        Création automatique en cours...
                      </div>
                    )}
                    {seedMutation.isSuccess && (
                      <div className="text-sm text-success font-medium">
                        ✅ Données ESAMBA créées avec succès
                      </div>
                    )}
                    <Button
                      onClick={() => seedMutation.mutate()}
                      disabled={seedMutation.isLoading}
                      variant={seedMutation.isSuccess ? "outline" : "default"}
                      className="w-full"
                    >
                      {seedMutation.isPending
                        ? "Création en cours..." 
                        : seedMutation.isSuccess
                        ? `Recréer les données ${ESAMBA_DEMO_INVITATION_CODE}`
                        : `Créer les données ${ESAMBA_DEMO_INVITATION_CODE}`}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Carte de vérification des données */}
              <Card className="animate-fade-in">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                      <CardTitle>Vérification des données</CardTitle>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchVerification()}
                      disabled={isVerifying}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isVerifying ? "animate-spin" : ""}`} />
                      Actualiser
                    </Button>
                  </div>
                  <CardDescription>
                    Vérifiez que toutes les données ESAMBA ont été créées dans votre base
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Organisation ESAMBA */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium">{ESAMBA_DEMO_ORG_NAME}</span>
                    {isVerifying ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                    ) : verificationStatus?.organisation ? (
                      <Badge variant="default" className="bg-success text-success-foreground hover:bg-success/90">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Créée
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Absente
                      </Badge>
                    )}
                  </div>

                  {/* Flotte ESAMBA */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium">{ESAMBA_DEMO_FLEET_NAME}</span>
                    {isVerifying ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                    ) : verificationStatus?.flotte ? (
                      <Badge variant="default" className="bg-success text-success-foreground hover:bg-success/90">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Créée
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Absente
                      </Badge>
                    )}
                  </div>

                  {/* Membership Organizer */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium">Membership Organizer</span>
                    {isVerifying ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                    ) : verificationStatus?.membership_organizer ? (
                      <Badge variant="default" className="bg-success text-success-foreground hover:bg-success/90">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Créé
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Absent
                      </Badge>
                    )}
                  </div>

                  {/* Véhicule ESAMBA-001 */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium">Véhicule {ESAMBA_DEMO_VEHICLE_REGISTRATION}</span>
                    {isVerifying ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                    ) : verificationStatus?.vehicule_esamba_001 ? (
                      <Badge variant="default" className="bg-success text-success-foreground hover:bg-success/90">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Créé
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Absent
                      </Badge>
                    )}
                  </div>

                  {/* Invitation ESAMBA-2024 */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium">Invitation {ESAMBA_DEMO_INVITATION_CODE}</span>
                    {isVerifying ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                    ) : verificationStatus?.invitation_esamba_2024 ? (
                      <Badge variant="default" className="bg-success text-success-foreground hover:bg-success/90">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Créée
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Absente
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Carte Mon espace organisateur */}
              <Card className="animate-fade-in">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      <CardTitle>Mon espace organisateur</CardTitle>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchMembers()}
                      disabled={isLoadingMembers}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingMembers ? "animate-spin" : ""}`} />
                      Actualiser
                    </Button>
                  </div>
                  <CardDescription>
                    Liste de tous les profils et leurs rôles dans votre flotte
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!userFleetId ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <p className="text-muted-foreground mb-4">
                        Créez une flotte pour commencer à gérer votre équipe.
                      </p>
                      <Button onClick={() => navigate("/dashboard/create-fleet")}>
                        Créer une flotte
                      </Button>
                    </div>
                  ) : isLoadingMembers ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Chargement des profils...</p>
                      </div>
                    </div>
                  ) : membersError ? (
                    <Alert variant="destructive">
                      <AlertTitle>Erreur de chargement</AlertTitle>
                      <AlertDescription>
                        {membersError.message || "Impossible de charger les profils. Veuillez réessayer."}
                      </AlertDescription>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetchMembers()}
                        className="mt-4"
                      >
                        Réessayer
                      </Button>
                    </Alert>
                  ) : groupedMembers.length === 0 ? (
                    <Alert>
                      <AlertTitle>Aucun membre trouvé</AlertTitle>
                      <AlertDescription>
                        Aucun profil n&apos;a encore été ajouté à votre flotte. Utilisez la page Équipes pour ajouter des membres.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-3">
                      {groupedMembers.map((member) => (
                        <div
                          key={member.user_id}
                          className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-semibold">
                                {member.profile?.full_name?.[0]?.toUpperCase() || "?"}
                              </div>
                              <div>
                                <h4 className="font-semibold">
                                  {member.profile?.full_name || "Sans nom"}
                                </h4>
                                {member.profile?.phone && (
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <Phone className="h-3 w-3" />
                                    <span>{member.profile.phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 ml-12">
                              {member.roles
                                .filter((r) => r.is_active)
                                .map((roleData) => (
                                  <Badge
                                    key={`${member.user_id}-${roleData.role}-${roleData.id}`}
                                    variant={getRoleBadgeVariant(roleData.role)}
                                    className="flex items-center gap-1"
                                  >
                                    {getRoleIcon(roleData.role)}
                                    {getRoleLabel(roleData.role)}
                                  </Badge>
                                ))}
                              {member.roles.filter((r) => !r.is_active).length > 0 && (
                                <Badge variant="outline" className="text-muted-foreground">
                                  {member.roles.filter((r) => !r.is_active).length} rôle(s) inactif(s)
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="text-sm text-muted-foreground pt-2 border-t">
                        Total : {groupedMembers.length} profil{groupedMembers.length > 1 ? "s" : ""} dans votre flotte
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
    </div>
  );
};

export default Settings;

