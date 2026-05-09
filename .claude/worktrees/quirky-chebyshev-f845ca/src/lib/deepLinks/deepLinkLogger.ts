import { ESAMBA_DEEP_LINK_SCHEME } from "@/lib/deepLinks/deepLinkConfig";

const TAG = "[Flotte E-Samba][DeepLink]";

function formatMeta(meta?: Record<string, unknown>): string {
  if (!meta || Object.keys(meta).length === 0) return "";
  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return "";
  }
}

/** Logs détaillés réservés au debug (activés en dev ou si window.__ESAMBA_DEBUG_DEEPLINK__ est true). */
export function deepLinkLogDebug(message: string, meta?: Record<string, unknown>): void {
  const verbose =
    import.meta.env.DEV ||
    (typeof window !== "undefined" &&
      (window as unknown as { __ESAMBA_DEBUG_DEEPLINK__?: boolean })
        .__ESAMBA_DEBUG_DEEPLINK__ === true);
  if (!verbose) return;
  console.debug(`${TAG} ${message}${formatMeta(meta)}`);
}

/** Trace toujours visible (succès / rejet de lien) — utile sur device avec remote debugging. */
export function deepLinkLogInfo(message: string, meta?: Record<string, unknown>): void {
  console.info(`${TAG} ${message}${formatMeta(meta)}`);
}

export function deepLinkLogWarn(message: string, meta?: Record<string, unknown>): void {
  console.warn(`${TAG} ${message}${formatMeta(meta)}`);
}

/** Contexte minimal pour corréler avec les logs natifs (scheme). */
export function deepLinkLogContext(): { scheme: string } {
  return { scheme: ESAMBA_DEEP_LINK_SCHEME };
}
