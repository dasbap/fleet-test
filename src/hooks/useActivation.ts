import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";

const BANNER_DISMISS_PREFIX = "esamba.activation_banner_dismissed_";
const ACTIVATION_WINDOW_DAYS = 7;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export type ActivationStepId =
  | "first_vehicle"
  | "first_creneau"
  | "first_alert"
  | "invite_member"
  | "first_report"
  | "step1"
  | "step2"
  | "step3"
  | "step4";

type CanonicalStepId = "first_vehicle" | "first_creneau" | "first_alert" | "invite_member" | "first_report";
type ChurnRisk = "low" | "medium" | "high";

export interface ActivationStep {
  id: CanonicalStepId;
  icon: string;
  label: string;
  description: string;
  impact: string;
  cta: string;
  href: string;
  completed: boolean;
}

const STEPS_CONFIG: Omit<ActivationStep, "completed">[] = [
  { id: "first_vehicle", icon: "🚐", label: "Ajouter un premier véhicule", description: "Enregistrez un véhicule pour démarrer le suivi.", impact: "Base activée", cta: "Ajouter un véhicule", href: "/dashboard/vehicles" },
  { id: "first_creneau", icon: "🕒", label: "Créer un premier créneau", description: "Lancez un premier créneau opérationnel.", impact: "Suivi activé", cta: "Planifier un créneau", href: "/dashboard/closure" },
  { id: "first_alert", icon: "🚨", label: "Configurer vos alertes", description: "Activez une alerte clé de supervision.", impact: "Moins d'imprévus", cta: "Voir les alertes", href: "/dashboard/alerts" },
  { id: "invite_member", icon: "👥", label: "Inviter votre équipe", description: "Ajoutez au moins un membre à la flotte.", impact: "Collaboration", cta: "Inviter l'équipe", href: "/dashboard/teams" },
  { id: "first_report", icon: "📊", label: "Consulter un premier rapport", description: "Validez vos premiers KPI de flotte.", impact: "Pilotage data", cta: "Voir les rapports", href: "/dashboard/reports" },
];

function normalizeStepId(stepId: ActivationStepId): CanonicalStepId {
  if (stepId === "step1") return "first_vehicle";
  if (stepId === "step2") return "first_alert";
  if (stepId === "step3") return "invite_member";
  if (stepId === "step4") return "first_report";
  return stepId;
}

function getChurnRisk(percentage: number): ChurnRisk {
  if (percentage >= 80) return "low";
  if (percentage >= 40) return "medium";
  return "high";
}

function isWithinActivationWindow(createdAt?: string): boolean {
  if (!createdAt) return false;
  const createdAtMs = new Date(createdAt).getTime();
  if (Number.isNaN(createdAtMs)) return false;
  return Date.now() - createdAtMs <= ACTIVATION_WINDOW_DAYS * DAY_IN_MS;
}

export function useActivation() {
  const { user, orgId } = useAuth();
  const onboardingQuery = useOnboarding(orgId ?? undefined);
  const [isDismissed, setIsDismissed] = useState(false);
  const [manualCompleted, setManualCompleted] = useState<Partial<Record<CanonicalStepId, boolean>>>({});

  const dismissKey = user?.id ? `${BANNER_DISMISS_PREFIX}${user.id}` : undefined;
  const onboardingStep = onboardingQuery.data?.step ?? 0;
  const onboardingCompleted = Boolean(onboardingQuery.data?.completed);

  useEffect(() => {
    if (!dismissKey || typeof window === "undefined") {
      setIsDismissed(false);
      return;
    }
    setIsDismissed(window.localStorage.getItem(dismissKey) === "1");
  }, [dismissKey]);

  const steps = useMemo(
    () =>
      STEPS_CONFIG.map((step, index) => ({
        ...step,
        completed: onboardingCompleted || onboardingStep >= index + 1 || Boolean(manualCompleted[step.id]),
      })),
    [manualCompleted, onboardingCompleted, onboardingStep],
  );

  const totalCount = steps.length;
  const completedCount = steps.filter((step) => step.completed).length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isAllDone = completedCount >= totalCount;
  const isBannerVisible = isWithinActivationWindow(user?.created_at) && !isAllDone && !isDismissed;

  const dismissBanner = useCallback(() => {
    if (!dismissKey || typeof window === "undefined") return;
    window.localStorage.setItem(dismissKey, "1");
    setIsDismissed(true);
  }, [dismissKey]);

  const completeStep = useCallback((stepId: ActivationStepId) => {
    const normalized = normalizeStepId(stepId);
    setManualCompleted((current) => ({ ...current, [normalized]: true }));
  }, []);

  return {
    steps,
    completedCount,
    totalCount,
    percentage,
    isAllDone,
    loading: onboardingQuery.isLoading,
    churnRisk: getChurnRisk(percentage),
    isBannerVisible,
    dismissBanner,
    completeStep,
    completedStepsCount: completedCount,
    totalSteps: totalCount,
    progressPercent: percentage,
    shouldShowBanner: isBannerVisible,
  };
}
