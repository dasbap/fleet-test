import type { NavigateFunction } from "react-router-dom";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { deepLinkLogDebug, deepLinkLogInfo } from "@/lib/deepLinks/deepLinkLogger";
import {
  ESAMBA_DEEP_LINK_WINDOW_EVENT,
  type EsambaDeepLinkEventDetail,
} from "@/lib/deepLinks/deepLinkConfig";
import { parseDeepLink, type ParsedDeepLink } from "@/lib/deepLinks/parseDeepLink";
import { resolveIncomingAppUrl } from "@/lib/deepLinks/resolveAppUrl";

function parsedToPath(parsed: Extract<ParsedDeepLink, { ok: true }>): string {
  switch (parsed.kind) {
    case "alerts_list":
      return ROUTE_PATHS.dashboardAlerts;
    case "fleet_list":
      return ROUTE_PATHS.dashboardVehicles;
    case "alert":
      return ROUTE_PATHS.dashboardAlertDetail(parsed.alertId);
    case "vehicle":
      return ROUTE_PATHS.dashboardVehicleDetail(parsed.vehicleId);
    case "mission":
      return ROUTE_PATHS.dashboardMissionDetail(parsed.missionId);
    case "intervention":
      return ROUTE_PATHS.dashboardInterventionDetail(parsed.ticketId);
    default: {
      const _exhaustive: never = parsed;
      return _exhaustive;
    }
  }
}

export type NavigateFromDeepLinkResult =
  | { success: true; path: string; parsed?: Extract<ParsedDeepLink, { ok: true }> }
  | { success: false; parsed?: ParsedDeepLink; reason?: string };

/**
 * Convertit un lien parsé en chemin React Router interne.
 */
export function deepLinkToInternalPath(parsed: Extract<ParsedDeepLink, { ok: true }>): string {
  return parsedToPath(parsed);
}

/**
 * Navigation React à partir d’une URL esamba://… (deep links métier uniquement).
 */
export function navigateFromDeepLinkUrl(
  rawUrl: string,
  navigate: NavigateFunction,
  options?: { replace?: boolean },
): NavigateFromDeepLinkResult {
  const parsed = parseDeepLink(rawUrl);
  if (!parsed.ok) {
    deepLinkLogInfo("Lien non routé", { rawUrl, reason: parsed.reason });
    return { success: false, parsed, reason: parsed.reason };
  }
  const path = parsedToPath(parsed);
  navigate(path, { replace: options?.replace ?? true });
  deepLinkLogDebug("Navigation appliquée", { rawUrl, path, kind: parsed.kind });
  return { success: true, path, parsed };
}

/**
 * Navigation depuis toute URL d’ouverture app : esamba://, https://www.e-samba.com, auth.
 */
export function navigateFromAppUrl(
  rawUrl: string,
  navigate: NavigateFunction,
  options?: { replace?: boolean },
): NavigateFromDeepLinkResult {
  const resolved = resolveIncomingAppUrl(rawUrl);

  if (resolved.kind === "spa") {
    navigate(resolved.path, { replace: options?.replace ?? true });
    deepLinkLogDebug("Navigation SPA (auth / App Link)", { rawUrl, path: resolved.path });
    return { success: true, path: resolved.path };
  }

  if (resolved.kind === "esamba_deep_link") {
    return navigateFromDeepLinkUrl(resolved.url, navigate, options);
  }

  deepLinkLogInfo("Lien non routé", { rawUrl, reason: resolved.reason });
  return { success: false, reason: resolved.reason };
}

/**
 * À appeler depuis un handler natif push (FCM, APNs) lorsque le plugin expose seulement une URL.
 */
export function dispatchDeepLinkUrlForNavigation(url: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<EsambaDeepLinkEventDetail>(ESAMBA_DEEP_LINK_WINDOW_EVENT, {
      detail: { url },
    }),
  );
  deepLinkLogDebug("Événement deep link dispatché (push / bridge natif)", { url });
}
