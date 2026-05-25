import { Link } from "react-router-dom";
import { CheckCircle2, Clock3, Play, Star, WifiOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { cn } from "@/lib/utils";
import type { TutorialWithUserState } from "@/services/tutorial.service";
import { formatTutorialDuration } from "@/features/tutorials/lib/tutorialVideo";

export interface TutorialCardProps {
  tutorial: TutorialWithUserState;
  isOfflineAvailable?: boolean;
  className?: string;
}

export function TutorialCard({
  tutorial,
  isOfflineAvailable = false,
  className,
}: TutorialCardProps) {
  const detailPath = ROUTE_PATHS.dashboardTutorialDetail(tutorial.id);

  return (
    <li className={cn("list-none", className)}>
      <Link
        to={detailPath}
        className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Lire le tutoriel : ${tutorial.title}`}
      >
        <Card className="h-full overflow-hidden transition-colors hover:border-primary/50 group-focus-visible:border-primary">
          <CardContent className="space-y-3 p-0">
            <div className="relative aspect-video w-full overflow-hidden bg-muted">
              <img
                src={tutorial.thumbUrl}
                alt=""
                className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                  <Play className="ml-0.5 h-5 w-5 fill-current" aria-hidden />
                </span>
              </div>
              <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                {tutorial.completed && (
                  <Badge variant="secondary" className="gap-0.5 text-[10px]">
                    <CheckCircle2 className="h-3 w-3" />
                    Terminé
                  </Badge>
                )}
                {isOfflineAvailable && (
                  <Badge variant="outline" className="gap-0.5 border-primary/40 bg-background/90 text-[10px]">
                    <WifiOff className="h-3 w-3" />
                    Hors ligne
                  </Badge>
                )}
                {tutorial.isFavorite && (
                  <Badge variant="default" className="gap-0.5 text-[10px]">
                    <Star className="h-3 w-3 fill-current" />
                    Favori
                  </Badge>
                )}
              </div>
            </div>
            <div className="space-y-1 px-3 pb-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {tutorial.categoryLabel}
              </p>
              <h2 className="text-sm font-semibold leading-snug">{tutorial.title}</h2>
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {tutorial.description}
              </p>
              <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" aria-hidden />
                {formatTutorialDuration(tutorial.durationSec)}
              </p>
            </div>
          </CardContent>
        </Card>
      </Link>
    </li>
  );
}
