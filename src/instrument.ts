/**
 * Initialisation Sentry (capture d'erreurs JS).
 * N'active l'envoi que si VITE_SENTRY_DSN est défini (ex. en production).
 * Tag "theme": "dark" pour filtrer les erreurs liées au thème (ADR 0001).
 */
import * as Sentry from "@sentry/react";

const dsn = import.meta.env.VITE_SENTRY_DSN;

if (dsn && typeof dsn === "string" && dsn.length > 0) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    initialScope: (scope) => {
      scope.setTag("theme", "dark");
      return scope;
    },
    beforeSend(event) {
      // Tag pour repérer les erreurs potentiellement liées au thème
      const message = event.message ?? "";
      const fromException = event.exception?.values?.some((e) =>
        /theme|Theme|dark|light|useTheme|forcedTheme|classList|\.dark/i.test(
          e.value ?? ""
        )
      );
      if (
        /theme|Theme|dark|light|useTheme|forcedTheme|classList|\.dark/i.test(
          message
        ) ||
        fromException
      ) {
        event.tags = { ...event.tags, theme_related: "true" };
      }
      return event;
    },
  });
}
