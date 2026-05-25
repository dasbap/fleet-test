/**
 * PostHog — suivi produit (opt-in via VITE_POSTHOG_KEY). Pas d'autocapture ; pas de PII dans identify.
 * posthog-js est chargé dynamiquement pour ne pas alourdir le bundle initial (~130 KB).
 */
import type PosthogType from "posthog-js";
import i18n from "@/i18n";
import { isNativePlatform } from "@/lib/platform";

const PH_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
/** Hôte API PostHog (variable d'environnement, repli UE si absent). */
const PH_HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ||
  "https://eu.posthog.com";

let didInit = false;
let analyticsEnabled = false;
// Instance chargée dynamiquement — null tant que posthog n'est pas initialisé.
let _ph: typeof PosthogType | null = null;

/** Propriétés globales PostHog (super properties) — pas de PII. */
function registerPosthogSuperProps(): void {
  _ph?.register({
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
  // Import dynamique : posthog-js ne bloque pas le rendu initial.
  void import("posthog-js").then(({ default: posthog }) => {
    try {
      posthog.init(PH_KEY!, {
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
      _ph = posthog;
      analyticsEnabled = true;
      registerPosthogSuperProps();
    } catch (e) {
      analyticsEnabled = false;
      if (import.meta.env.DEV) {
        console.warn("[Analytics] Échec init PostHog — désactivé", e);
      }
    }
  });
}

export function identifyAnalyticsUser(userId: string | undefined): void {
  if (!analyticsEnabled || !_ph) return;
  if (userId) {
    _ph.identify(userId);
  } else {
    _ph.reset();
    registerPosthogSuperProps();
  }
}

/** Met à jour les propriétés globales lorsque la langue change (sans réémettre de pageview). */
export function syncAnalyticsLanguage(): void {
  if (!analyticsEnabled) return;
  registerPosthogSuperProps();
}

export function capturePageview(): void {
  if (!analyticsEnabled || !_ph) return;
  _ph.capture("$pageview", {
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
  | "language_changed"
  | "tutorial_offline_downloaded"
  | "tutorial_offline_removed"
  | "tutorial_offline_played"
  | "tutorial_offline_checksum_failed"
  | "tutorial_offline_purged"
  | "tutorial_viewed"
  | "tutorial_completed";

type EventProps = Record<string, string | number | boolean | null>;

export function track(event: EventName, props?: EventProps): void {
  if (!analyticsEnabled || !_ph) return;
  _ph.capture(event, {
    ...props,
    lang: i18n.language,
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

  tutorialOfflineDownloaded: (tutorialId: string, sizeBytes: number, durationMs: number) =>
    track("tutorial_offline_downloaded", {
      tutorial_id: tutorialId,
      size_bytes: sizeBytes,
      duration_ms: durationMs,
    }),

  tutorialOfflineRemoved: (tutorialId: string) =>
    track("tutorial_offline_removed", { tutorial_id: tutorialId }),

  tutorialOfflinePlayed: (tutorialId: string, source: "offline" | "online") =>
    track("tutorial_offline_played", { tutorial_id: tutorialId, source }),

  tutorialOfflineChecksumFailed: (tutorialId: string) =>
    track("tutorial_offline_checksum_failed", { tutorial_id: tutorialId }),

  tutorialOfflinePurged: (tutorialId: string, reason: "quota") =>
    track("tutorial_offline_purged", { tutorial_id: tutorialId, reason }),

  tutorialViewed: (
    tutorialId: string,
    source: "online" | "offline",
    watchedSec: number,
  ) =>
    track("tutorial_viewed", {
      tutorial_id: tutorialId,
      source,
      watched_sec: watchedSec,
    }),

  tutorialCompleted: (tutorialId: string) =>
    track("tutorial_completed", { tutorial_id: tutorialId }),
};
