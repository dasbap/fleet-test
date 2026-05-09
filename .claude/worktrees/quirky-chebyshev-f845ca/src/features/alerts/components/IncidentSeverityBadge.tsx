import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { IncidentAlertSeverity } from "@/types/incident-alert";
import { INCIDENT_SEVERITY_LABELS } from "@/features/alerts/lib/incidentLabels";

interface IncidentSeverityBadgeProps {
  severity: IncidentAlertSeverity;
  className?: string;
}

const styles: Record<IncidentAlertSeverity, string> = {
  basse: "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
  moyenne: "border-info/30 bg-info/10 text-info",
  haute: "border-warning/35 bg-warning/10 text-warning",
  critique: "border-destructive/35 bg-destructive/10 text-destructive",
};

export function IncidentSeverityBadge({
  severity,
  className,
}: IncidentSeverityBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", styles[severity], className)}
    >
      {INCIDENT_SEVERITY_LABELS[severity]}
    </Badge>
  );
}
