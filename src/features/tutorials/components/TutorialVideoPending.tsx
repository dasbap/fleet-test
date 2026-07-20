import { Link } from "react-router-dom";
import { Clock, RefreshCw, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { cn } from "@/lib/utils";

export interface TutorialVideoPendingProps {
  title: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

export function TutorialVideoPending({
  title,
  onRetry,
  isRetrying = false,
  className,
}: TutorialVideoPendingProps) {
  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="flex aspect-video flex-col items-center justify-center gap-4 py-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Video className="h-7 w-7 text-muted-foreground" aria-hidden />
        </div>
        <div className="max-w-sm space-y-2">
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">
            La vidéo de ce guide sera disponible prochainement.
          </p>
          <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            Vous pouvez consulter la description ci-dessus en attendant la mise en ligne du
            fichier.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {onRetry && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isRetrying}
              onClick={onRetry}
            >
              <RefreshCw
                className={cn("mr-2 h-4 w-4", isRetrying && "animate-spin")}
                aria-hidden
              />
              Actualiser
            </Button>
          )}
          <Button asChild variant="secondary" size="sm">
            <Link to={ROUTE_PATHS.dashboardTutorials}>Retour à la liste</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
