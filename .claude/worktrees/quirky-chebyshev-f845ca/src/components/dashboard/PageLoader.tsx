import { Loader2 } from "lucide-react";

/**
 * Loader plein écran pour les pages dashboard (état de chargement auth ou données).
 */
export function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
