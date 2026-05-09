import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useEsambaDataVerification } from "@/hooks/useEsambaDataVerification";
import { useSeedEsambaData } from "@/hooks/useSeedEsambaData";
import { PageLoader } from "@/components/dashboard/PageLoader";
import {
  ESAMBA_DEMO_FLEET_NAME,
  ESAMBA_DEMO_INVITATION_CODE,
  ESAMBA_DEMO_ORG_NAME,
  ESAMBA_DEMO_VEHICLE_REGISTRATION,
} from "@/constants/esamba-demo.constants";
import {
  Settings as SettingsIcon,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Shield,
  Languages,
  HelpCircle,
  ChevronRight,
} from "lucide-react";
import { BiometricLockSettingsCard } from "@/components/mobile/BiometricLockSettingsCard";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { recommendTutorialOfflineQuota } from "@/lib/tutorialOfflineQuotaRecommendation";
import { SettingsSection, SettingsRow } from "@/features/account/components";
import { ACCOUNT_EXTERNAL_LINKS } from "@/features/account/config/accountLinks";
import { FleetTeamManagementPanel } from "@/features/teams/components";

const Settings = () => {
  const { t } = useTranslation("common");
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const {
    data: verificationStatus,
    isLoading: isVerifying,
    refetch: refetchVerification,
  } = useEsambaDataVerification();
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

  const openExternal = (url: string | undefined, label: string) => {
    if (url && url.length > 1) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    toast({
      title: `${label}`,
      description: "Lien à configurer (variable d’environnement ou API).",
    });
  };

  if (authLoading || !user) {
    return <PageLoader />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading flex items-center gap-2 text-2xl font-bold md:text-3xl">
            <SettingsIcon className="h-7 w-7" />
            {t("settingsPage.title")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("settingsPage.description")}</p>
        </div>
      </div>

      <SettingsSection
        title={t("settingsPage.languageSectionTitle")}
        description={t("settingsPage.languageSectionDescription")}
      >
        <SettingsRow>
          <div className="flex w-full items-center gap-3">
            <Languages className="text-muted-foreground h-5 w-5 shrink-0" />
            <LanguageSwitcher />
          </div>
        </SettingsRow>
      </SettingsSection>

      <BiometricLockSettingsCard />

      <SettingsSection
        title="Quota offline tutoriels (suggestion)"
        description="Détection automatique du profil appareil pour proposer une valeur recommandée."
      >
        <SettingsRow className="flex-col items-stretch gap-2 text-sm">
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
          <p className="text-muted-foreground text-xs">
            Pour appliquer la recommandation, modifiez <code>VITE_TUTORIAL_OFFLINE_QUOTA_MB</code> dans votre
            fichier d’environnement.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => void handleCopyRecommendedQuota()}
          >
            Copier la valeur recommandée
          </Button>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        title="Données de démo ESAMBA"
        description={
          <>
            Crée automatiquement une organisation, une flotte, un véhicule et une invitation
            <span className="font-mono font-semibold"> {ESAMBA_DEMO_INVITATION_CODE}</span> dans votre base.
          </>
        }
      >
        <SettingsRow className="flex-col items-stretch gap-4">
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
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <div className="border-primary h-4 w-4 animate-spin rounded-full border-b-2" />
                Création automatique en cours...
              </div>
            )}
            {seedMutation.isSuccess && (
              <div className="text-success text-sm font-medium">✅ Données ESAMBA créées avec succès</div>
            )}
            <Button
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
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
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        title={
          <span className="flex items-center gap-2">
            <CheckCircle2 className="text-success h-5 w-5" />
            Vérification des données
          </span>
        }
        description="Vérifiez que toutes les données ESAMBA ont été créées dans votre base."
      >
        <SettingsRow className="justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchVerification()}
            disabled={isVerifying}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isVerifying ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </SettingsRow>

        <SettingsRow>
          <span className="text-sm font-medium">{ESAMBA_DEMO_ORG_NAME}</span>
          {isVerifying ? (
            <div className="border-primary h-4 w-4 animate-spin rounded-full border-b-2" />
          ) : verificationStatus?.organisation ? (
            <Badge variant="default" className="bg-success text-success-foreground hover:bg-success/90">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Créée
            </Badge>
          ) : (
            <Badge variant="destructive">
              <XCircle className="mr-1 h-3 w-3" />
              Absente
            </Badge>
          )}
        </SettingsRow>

        <SettingsRow>
          <span className="text-sm font-medium">{ESAMBA_DEMO_FLEET_NAME}</span>
          {isVerifying ? (
            <div className="border-primary h-4 w-4 animate-spin rounded-full border-b-2" />
          ) : verificationStatus?.flotte ? (
            <Badge variant="default" className="bg-success text-success-foreground hover:bg-success/90">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Créée
            </Badge>
          ) : (
            <Badge variant="destructive">
              <XCircle className="mr-1 h-3 w-3" />
              Absente
            </Badge>
          )}
        </SettingsRow>

        <SettingsRow>
          <span className="text-sm font-medium">Membership Organizer</span>
          {isVerifying ? (
            <div className="border-primary h-4 w-4 animate-spin rounded-full border-b-2" />
          ) : verificationStatus?.membership_organizer ? (
            <Badge variant="default" className="bg-success text-success-foreground hover:bg-success/90">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Créé
            </Badge>
          ) : (
            <Badge variant="destructive">
              <XCircle className="mr-1 h-3 w-3" />
              Absent
            </Badge>
          )}
        </SettingsRow>

        <SettingsRow>
          <span className="text-sm font-medium">Véhicule {ESAMBA_DEMO_VEHICLE_REGISTRATION}</span>
          {isVerifying ? (
            <div className="border-primary h-4 w-4 animate-spin rounded-full border-b-2" />
          ) : verificationStatus?.vehicule_esamba_001 ? (
            <Badge variant="default" className="bg-success text-success-foreground hover:bg-success/90">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Créé
            </Badge>
          ) : (
            <Badge variant="destructive">
              <XCircle className="mr-1 h-3 w-3" />
              Absent
            </Badge>
          )}
        </SettingsRow>

        <SettingsRow>
          <span className="text-sm font-medium">Invitation {ESAMBA_DEMO_INVITATION_CODE}</span>
          {isVerifying ? (
            <div className="border-primary h-4 w-4 animate-spin rounded-full border-b-2" />
          ) : verificationStatus?.invitation_esamba_2024 ? (
            <Badge variant="default" className="bg-success text-success-foreground hover:bg-success/90">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Créée
            </Badge>
          ) : (
            <Badge variant="destructive">
              <XCircle className="mr-1 h-3 w-3" />
              Absente
            </Badge>
          )}
        </SettingsRow>
      </SettingsSection>

      <FleetTeamManagementPanel layout="embedded" currentUserId={user?.id ?? null} />

      <SettingsSection title="Aide & confidentialité">
        <SettingsRow>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 text-left"
            onClick={() => openExternal(ACCOUNT_EXTERNAL_LINKS.helpCenter, "Centre d’aide")}
          >
            <span className="flex items-center gap-3">
              <HelpCircle className="text-muted-foreground h-5 w-5" />
              <span className="text-sm font-medium">Centre d’aide</span>
            </span>
            <ChevronRight className="text-muted-foreground h-4 w-4" />
          </button>
        </SettingsRow>
        <SettingsRow>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 text-left"
            onClick={() =>
              openExternal(ACCOUNT_EXTERNAL_LINKS.privacyPolicy, "Politique de confidentialité")
            }
          >
            <span className="flex items-center gap-3">
              <Shield className="text-muted-foreground h-5 w-5" />
              <span className="text-sm font-medium">Politique de confidentialité</span>
            </span>
            <ChevronRight className="text-muted-foreground h-4 w-4" />
          </button>
        </SettingsRow>
      </SettingsSection>
    </div>
  );
};

export default Settings;
