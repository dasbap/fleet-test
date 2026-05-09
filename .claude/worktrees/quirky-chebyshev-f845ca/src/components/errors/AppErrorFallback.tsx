import type { FallbackRender } from "@sentry/react";

/**
 * Écran affiché lorsqu’une erreur de rendu est capturée par la boundary racine (Sentry).
 */
export const AppErrorFallback: FallbackRender = ({ error, resetError, componentStack }) => (
  <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4 p-4">
    <p className="text-muted-foreground text-center">
      Une erreur est survenue. Veuillez recharger la page.
    </p>
    {import.meta.env.DEV && error != null && (
      <details className="max-w-2xl w-full rounded-md border border-destructive/40 bg-muted/30 p-3 text-left text-xs">
        <summary className="cursor-pointer font-medium text-destructive">
          Détail technique (mode développement)
        </summary>
        <pre className="mt-2 whitespace-pre-wrap break-words text-muted-foreground">
          {error instanceof Error ? error.message : String(error)}
        </pre>
        {componentStack ? (
          <pre className="mt-2 max-h-40 overflow-auto text-[10px] text-muted-foreground/80">
            {componentStack}
          </pre>
        ) : null}
      </details>
    )}
    <button
      type="button"
      onClick={() => resetError()}
      className="text-sm font-medium text-primary underline underline-offset-4 hover:no-underline"
    >
      Recharger la page
    </button>
  </div>
);
