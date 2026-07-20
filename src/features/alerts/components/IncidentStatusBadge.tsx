import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { IncidentWorkflowStatus } from "@/types/incident-alert";

interface IncidentStatusBadgeProps {
  status: IncidentWorkflowStatus;
  className?: string;
}

const LABELS: Record<IncidentWorkflowStatus, string> = {
  NOUVEAU: "Nouveau",
  EN_COURS: "En cours",
  RESOLU: "Résolu",
};

const styles: Record<IncidentWorkflowStatus, string> = {
  NOUVEAU: "border-info/35 bg-info/10 text-info",
  EN_COURS: "border-warning/35 bg-warning/10 text-warning",
  RESOLU: "border-success/35 bg-success/10 text-success",
};

export function IncidentStatusBadge({
  status,
  className,
}: IncidentStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", styles[status], className)}
    >
      {LABELS[status]}
    </Badge>
  );
}
