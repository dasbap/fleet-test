import type { NavigateFunction } from "react-router-dom";
import {
  buildEsambaDeepLinkUrl,
  buildEsambaOperationsDeepLink,
  parseDeepLink,
  type EsambaDeepLinkBuildTarget,
  type ParsedDeepLink,
} from "@/lib/deepLinks/parseDeepLink";
import {
  deepLinkToInternalPath,
  dispatchDeepLinkUrlForNavigation,
  navigateFromAppUrl,
  type NavigateFromDeepLinkResult,
} from "@/lib/deepLinks/deepLinkNavigation";
import { deepLinkLogDebug } from "@/lib/deepLinks/deepLinkLogger";
import {
  ESAMBA_INTERNAL_PATH_WINDOW_EVENT,
  type EsambaInternalPathEventDetail,
} from "@/lib/deepLinks/deepLinkConfig";

/** Payload minimal pour une notification push (à étendre côté backend). */
export interface PushNotificationDeepLinkPayload {
  /** URL complète esamba://… */
  esambaUrl?: string;
  /** Chemin SPA déjà résolu (ex. /dashboard/alerts/xxx) */
  internalPath?: string;
  /** Alternative : cible structurée (génère l’URL via `buildEsambaDeepLinkUrl`). */
  deepLinkTarget?: EsambaDeepLinkBuildTarget;
}

/**
 * Façade : parsing, conversion en route SPA, pont push natif.
 * La navigation React reste dans les composants (injection de `navigate`).
 */
export class DeepLinkService {
  parse(rawUrl: string): ParsedDeepLink {
    return parseDeepLink(rawUrl);
  }

  toInternalPath(parsed: Extract<ParsedDeepLink, { ok: true }>): string {
    return deepLinkToInternalPath(parsed);
  }

  navigate(rawUrl: string, navigate: NavigateFunction, options?: { replace?: boolean }): NavigateFromDeepLinkResult {
    return navigateFromAppUrl(rawUrl, navigate, options);
  }

  /** URL stable pour données FCM/APNs (sans ambiguïté mission / intervention). */
  buildPushUrl(target: EsambaDeepLinkBuildTarget): string {
    return buildEsambaDeepLinkUrl(target);
  }

  /** Variante compacte `esamba://operations/:id?kind=…`. */
  buildOperationsPushUrl(id: string, kind: "mission" | "intervention"): string {
    return buildEsambaOperationsDeepLink(id, kind);
  }

  /**
   * À brancher sur le SDK push : déclenche le même flux que `appUrlOpen` ou une navigation directe.
   */
  dispatchFromPushPayload(payload: PushNotificationDeepLinkPayload): void {
    if (payload.internalPath) {
      const path = payload.internalPath.startsWith("/")
        ? payload.internalPath
        : `/${payload.internalPath}`;
      deepLinkLogDebug("Push : chemin interne", { path });
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent<EsambaInternalPathEventDetail>(ESAMBA_INTERNAL_PATH_WINDOW_EVENT, {
            detail: { path },
          }),
        );
      }
      return;
    }
    if (payload.deepLinkTarget) {
      const url = buildEsambaDeepLinkUrl(payload.deepLinkTarget);
      deepLinkLogDebug("Push : cible structurée", { url, target: payload.deepLinkTarget });
      dispatchDeepLinkUrlForNavigation(url);
      return;
    }
    if (payload.esambaUrl) {
      dispatchDeepLinkUrlForNavigation(payload.esambaUrl);
    }
  }
}

export const deepLinkService = new DeepLinkService();

export type { EsambaDeepLinkBuildTarget } from "@/lib/deepLinks/parseDeepLink";
