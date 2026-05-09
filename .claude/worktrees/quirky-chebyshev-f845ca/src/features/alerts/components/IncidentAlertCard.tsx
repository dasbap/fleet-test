import { Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale/fr";
import { Car, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import type { FleetIncidentAlertListItem } from "@/types/incident-alert";
import { INCIDENT_KIND_LABELS } from "@/features/alerts/lib/incidentLabels";
import { IncidentSeverityBadge } from "./IncidentSeverityBadge";
import { IncidentStatusBadge } from "./IncidentStatusBadge";
import { cn } from "@/lib/utils";

interface IncidentAlertCardProps {
  alert: FleetIncidentAlertListItem;
  className?: string;
}

export function IncidentAlertCard({ alert, className }: IncidentAlertCardProps) {
  const to = ROUTE_PATHS.dashboardAlertDetail(alert.id);
  const dateLabel = (() => {
    try {
      return format(new Date(alert.createdAt), "d MMM yyyy à HH:mm", {
        locale: fr,
      });
    } catch {
      return "—";
    }
  })();

  return (
    <Link
      to={to}
      className={cn(
        "block rounded-xl outline-none transition-transform active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-ring touch-manipulation",
        className
      )}
    >
      <Card className="h-full border-border/80 shadow-sm transition-colors hover:bg-muted/35">
        <CardContent className="space-y-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-heading font-semibold leading-tight line-clamp-2">
                {alert.title}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {INCIDENT_KIND_LABELS[alert.kind]}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-1.5 justify-end">
              <IncidentSeverityBadge severity={alert.severity} />
              <IncidentStatusBadge status={alert.status} />
            </div>
          </div>

          <div className="flex items-start gap-2 text-sm">
            <Car className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="line-clamp-2">{alert.vehicleLabel}</span>
          </div>

          <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2 text-xs">
            <span>{dateLabel}</span>
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" aria-hidden />
              {alert.assignee ? (
                <span className="text-foreground font-medium truncate max-w-[12rem]">
                  {alert.assignee.fullName}
                </span>
              ) : (
                <span className="italic">Non assigné</span>
              )}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
