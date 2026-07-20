import * as Sentry from "@sentry/react";

const TAG = "[Flotte E-Samba]";

/** True si Sentry est configuré (aligné sur `instrument.ts`). */
function isSentryEnabled(): boolean {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  return typeof dsn === "string" && dsn.length > 0;
}

function formatContext(context?: Record<string, unknown>): string {
  if (!context || Object.keys(context).length === 0) return "";
  try {
    return ` ${JSON.stringify(context)}`;
  } catch {
    return " [context non sérialisable]";
  }
}

/** Logs détaillés réservés au développement. */
export function logDebug(message: string, context?: Record<string, unknown>): void {
  if (!import.meta.env.DEV) return;
  console.debug(`${TAG} ${message}${formatContext(context)}`);
}

export function logInfo(message: string, context?: Record<string, unknown>): void {
  console.info(`${TAG} ${message}${formatContext(context)}`);
}

export function logWarn(message: string, context?: Record<string, unknown>): void {
  console.warn(`${TAG} ${message}${formatContext(context)}`);
}

/**
 * Erreur applicative : console + envoi Sentry si activé.
 * Pour `source: "error-boundary"`, ne pas renvoyer l’exception (déjà capturée par la boundary Sentry) — fil d’Ariane seulement.
 */
export function logError(
  message: string,
  error?: unknown,
  context?: Record<string, unknown>
): void {
  if (error !== undefined) {
    console.error(`${TAG} ${message}`, error, context ?? {});
  } else {
    console.error(`${TAG} ${message}`, context ?? {});
  }

  if (!isSentryEnabled()) return;

  const source = context?.source;
  if (source === "error-boundary") {
    Sentry.addBreadcrumb({
      category: "error-boundary",
      message,
      level: "error",
      data: {
        errMessage: error instanceof Error ? error.message : error != null ? String(error) : undefined,
      },
    });
    return;
  }

  const err =
    error instanceof Error
      ? error
      : new Error(message);

  Sentry.captureException(err, {
    tags: {
      source: typeof source === "string" ? source : "app",
    },
    extra: context,
  });
}
