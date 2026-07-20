import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PageErrorStateProps {
  /** Titre court (sans détail technique). */
  title?: string;
  /** Message affiché à l’utilisateur (pas de stack). */
  message: string;
  /** Libellé du bouton de nouvel essai. */
  retryLabel?: string;
  /** Appelé lorsque l’utilisateur demande un nouvel essai (ex. `refetch`). */
  onRetry?: () => void;
  className?: string;
}

/**
 * Bloc d’erreur réutilisable pour les écrans alimentés par React Query ou équivalent.
 */
export function PageErrorState({
  title = "Chargement impossible",
  message,
  retryLabel = "Réessayer",
  onRetry,
  className,
}: PageErrorStateProps) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-lg border border-destructive/30 bg-muted/20 px-4 py-10 text-center",
        className
      )}
    >
      <AlertCircle className="h-10 w-10 text-destructive" aria-hidden />
      <div className="space-y-1">
        <p className="text-base font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry ? (
        <Button type="button" variant="outline" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
