/**
 * PostHog — suivi produit (opt-in via VITE_POSTHOG_KEY). Pas d’autocapture ; pas de PII dans identify.
 */
import posthog from "posthog-js";
import i18n from "@/i18n";
import { isNativePlatform } from "@/lib/platform";

const PH_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
/** Hôte API PostHog (variable d’environnement, repli UE si absent). */
const PH_HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ||
  "https://eu.posthog.com";

let didInit = false;
let analyticsEnabled = false;

/** Propriétés globales PostHog (super properties) — pas de PII. */
function registerPosthogSuperProps(): void {
  posthog.register({
    app_version: import.meta.env.VITE_APP_VERSION ?? "dev",
    lang: i18n.language,
  });
}

export function initAnalytics(): void {
  if (didInit) return;
  didInit = true;
  if (!PH_KEY) {
    if (import.meta.env.DEV) {
      console.info("[Analytics] PostHog key manquante — désactivé");
    }
    return;
  }
  const native = isNativePlatform();
  try {
    posthog.init(PH_KEY, {
      api_host: PH_HOST,
      persistence: "localStorage",
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      /** WebView natif : session replay souvent fragile ou coûteux ; le web garde le masquage champs sensibles. */
      disable_session_recording: native,
      ...(!native
        ? {
            session_recording: {
              maskAllInputs: true,
              maskInputOptions: { password: true, email: true },
            },
          }
        : {}),
      sanitize_properties: (properties) => {
        delete properties["$email"];
        delete properties["phone"];
        return properties;
      },
    });
    analyticsEnabled = true;
    registerPosthogSuperProps();
  } catch (e) {
    analyticsEnabled = false;
    if (import.meta.env.DEV) {
      console.warn("[Analytics] Échec init PostHog — désactivé", e);
    }
  }
}

export function identifyAnalyticsUser(userId: string | undefined): void {
  if (!analyticsEnabled) return;
  if (userId) {
    posthog.identify(userId);
  } else {
    posthog.reset();
    registerPosthogSuperProps();
  }
}

/** Met à jour les propriétés globales lorsque la langue change (sans réémettre de pageview). */
export function syncAnalyticsLanguage(): void {
  if (!analyticsEnabled) return;
  registerPosthogSuperProps();
}

export function capturePageview(): void {
  if (!analyticsEnabled) return;
  posthog.capture("$pageview", {
    $current_url: window.location.href,
    lang: i18n.language,
  });
}

type EventName =
  | "vehicle_viewed"
  | "alert_resolved"
  | "maintenance_planned"
  | "maintenance_completed"
  | "qr_scanned"
  | "report_exported"
  | "onboarding_completed"
  | "onboarding_step_completed"
  | "feedback_submitted"
  | "search_performed"
  | "biometric_auth_success"
  | "biometric_auth_failed"
  | "language_changed";

type EventProps = Record<string, string | number | boolean | null>;

export function track(event: EventName, props?: EventProps): void {
  if (!analyticsEnabled) return;
  posthog.capture(event, {
    ...props,
    $time: new Date().toISOString(),
  });
}

export const analytics = {
  vehicleViewed: (vehicleId: string) =>
    track("vehicle_viewed", { vehicle_id: vehicleId }),

  alertResolved: (alertId: string, severity: string, resolveTimeMs: number) =>
    track("alert_resolved", {
      alert_id: alertId,
      severity,
      resolve_time_ms: resolveTimeMs,
    }),

  maintenancePlanned: (
    vehicleId: string,
    type: string,
    estimatedCostXaf: number | null
  ) =>
    track("maintenance_planned", {
      vehicle_id: vehicleId,
      maintenance_type: type,
      estimated_cost_xaf: estimatedCostXaf,
    }),

  qrScanned: (vehicleId: string) =>
    track("qr_scanned", { vehicle_id: vehicleId }),

  reportExported: (vehicleId: string, format: "pdf" | "xlsx") =>
    track("report_exported", { vehicle_id: vehicleId, format }),

  onboardingCompleted: (durationMs: number, vehiclesAdded: number) =>
    track("onboarding_completed", {
      duration_ms: durationMs,
      vehicles_added: vehiclesAdded,
    }),

  onboardingStep: (step: number, label: string) =>
    track("onboarding_step_completed", { step, step_label: label }),

  feedbackSubmitted: (trigger: string, score: number) =>
    track("feedback_submitted", { trigger, score }),

  searchPerformed: (query: string, resultCount: number) =>
    track("search_performed", {
      query_length: query.length,
      result_count: resultCount,
    }),

  biometricSuccess: () => track("biometric_auth_success"),

  biometricFailed: (reason: string) =>
    track("biometric_auth_failed", { reason }),

  languageChanged: (from: string, to: string) =>
    track("language_changed", { from_lang: from, to_lang: to }),
};
