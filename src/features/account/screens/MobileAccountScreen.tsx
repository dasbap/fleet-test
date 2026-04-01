import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  ChevronRight,
  HelpCircle,
  LogOut,
  Shield,
  UserCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageLoader } from "@/components/dashboard/PageLoader";
import { signOut, useAuth } from "@/hooks/useAuth";
import { useUserFleets } from "@/hooks/useUserFleets";
import { toast } from "@/hooks/use-toast";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { FLEET_ROLE_LABELS, type FleetRole } from "@/types/role";
import { ACCOUNT_EXTERNAL_LINKS } from "@/features/account/config/accountLinks";
import { accountPreferencesService } from "@/features/account/services/accountPreferencesService";
import { useAccountPreferences } from "@/features/account/hooks/useAccountPreferences";
import {
  NotificationPreferenceSwitch,
  ProfileCard,
  SettingsRow,
  SettingsSection,
  SyncStatusIndicator,
} from "@/features/account/components";
import { useOfflineSyncStatus } from "@/hooks/useOfflineSyncStatus";
import { cn } from "@/lib/utils";
import {
  mobileScreenRootColumn,
  mobileScreenSubtitle,
  mobileScreenTitle,
} from "@/lib/mobile/mobileUiTokens";

function displayNameFromUser(user: ReturnType<typeof useAuth>["user"]) {
  if (!user) return "Utilisateur";
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const name = meta?.full_name;
  if (typeof name === "string" && name.trim()) return name.trim();
  return user.email?.split("@")[0] ?? "Utilisateur";
}

function initialsFromName(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";
}

/**
 * Écran Compte mobile — profil, rôle, flotte, préférences, aide, déconnexion.
 */
export default function MobileAccountScreen() {
  const navigate = useNavigate();
  const { user, role, memberships, userFleetId, isLoading: authLoading } =
    useAuth();
  const { fleetById, isLoading: fleetsLoading } = useUserFleets(memberships);
  const prefs = useAccountPreferences();
  const offlineSync = useOfflineSyncStatus();
  const [loggingOut, setLoggingOut] = useState(false);

  const fullName = useMemo(() => displayNameFromUser(user), [user]);
  const initials = useMemo(() => initialsFromName(fullName), [fullName]);

  const fleetName = userFleetId
    ? fleetById[userFleetId]?.name ?? "—"
    : "—";

  const roleLabel =
    role != null
      ? FLEET_ROLE_LABELS[role as FleetRole]
      : "Aucun rôle actif";

  /** Simulation courte de synchronisation au chargement (remplaçable par worker/API). */
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      void accountPreferencesService.reportSyncStatus("syncing");
    }, 400);
    const timer2 = window.setTimeout(() => {
      if (cancelled) return;
      void accountPreferencesService.reportSyncStatus("synced");
    }, 2200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearTimeout(timer2);
    };
  }, []);

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

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const { error } = await signOut();
      if (error) {
        toast({
          title: "Déconnexion impossible",
          description: "Réessayez dans un instant.",
          variant: "destructive",
        });
        return;
      }
      navigate(ROUTE_PATHS.auth, { replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  if (authLoading || (memberships.length > 0 && fleetsLoading)) {
    return <PageLoader />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className={cn(mobileScreenRootColumn, "flex flex-col gap-7 pb-8")}>
      <div>
        <h1 className={mobileScreenTitle}>Compte</h1>
        <p className={cn(mobileScreenSubtitle, "mt-1")}>
          Profil et paramètres Flotte E-Samba
        </p>
      </div>

      <ProfileCard
        displayName={fullName}
        email={user.email ?? null}
        initials={initials}
      />

      <SettingsSection
        title="Identité & organisation"
        description="Rôle et flotte rattachée à votre session."
      >
        <SettingsRow>
          <div className="flex items-start gap-3">
            <UserCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Rôle actuel</p>
              <p className="text-muted-foreground text-xs">{roleLabel}</p>
            </div>
          </div>
        </SettingsRow>
        <SettingsRow>
          <div className="flex items-start gap-3">
            <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-sm font-medium">Société / parc rattaché</p>
              <p className="text-muted-foreground truncate text-xs">
                {fleetName}
                {userFleetId && (
                  <span className="block font-mono text-[10px] opacity-70">
                    ID flotte : {userFleetId.slice(0, 8)}…
                  </span>
                )}
              </p>
            </div>
          </div>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Préférences" description="Notifications et langue d’affichage.">
        <SettingsRow>
          <NotificationPreferenceSwitch
            checked={prefs.notificationsEnabled}
            onCheckedChange={(v) => void prefs.setNotifications(v)}
          />
        </SettingsRow>
        <SettingsRow className="flex-col items-stretch gap-3">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Label htmlFor="account-lang" className="text-sm font-medium">
              Langue
            </Label>
            <Select
              value={prefs.language}
              onValueChange={(v) =>
                void prefs.setLanguage(v as "fr" | "en")
              }
            >
              <SelectTrigger id="account-lang" className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-muted-foreground text-xs">
            Le changement de langue sera appliqué à l’application une fois l’i18n
            branché côté API.
          </p>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        title="Synchronisation"
        description="État réseau et file d’attente hors ligne."
      >
        <SettingsRow>
          <SyncStatusIndicator syncStatus={offlineSync.displayStatus} />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Aide & confidentialité">
        <SettingsRow>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 text-left"
            onClick={() =>
              openExternal(ACCOUNT_EXTERNAL_LINKS.helpCenter, "Centre d’aide")
            }
          >
            <span className="flex items-center gap-3">
              <HelpCircle className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">Centre d’aide</span>
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </SettingsRow>
        <SettingsRow>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 text-left"
            onClick={() =>
              openExternal(
                ACCOUNT_EXTERNAL_LINKS.privacyPolicy,
                "Politique de confidentialité"
              )
            }
          >
            <span className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">
                Politique de confidentialité
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </SettingsRow>
      </SettingsSection>

      <Button
        type="button"
        variant="destructive"
        className="w-full gap-2"
        disabled={loggingOut}
        onClick={() => void handleLogout()}
      >
        <LogOut className="h-4 w-4" aria-hidden />
        {loggingOut ? "Déconnexion…" : "Déconnexion"}
      </Button>
    </div>
  );
}
