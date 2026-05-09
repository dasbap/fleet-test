import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FleetVehicleAvailability } from "@/types/fleet-vehicle";

interface VehicleStatusBadgeProps {
  availability: FleetVehicleAvailability;
  label?: string;
  className?: string;
}

const availabilityStyles: Record<
  FleetVehicleAvailability,
  string
> = {
  available:
    "border-success/30 bg-success/10 text-success hover:bg-success/15",
  on_mission:
    "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15",
  stopped: "border-warning/30 bg-warning/10 text-warning hover:bg-warning/15",
  maintenance:
    "border-destructive/25 bg-destructive/10 text-destructive hover:bg-destructive/15",
};

/**
 * Badge de statut opérationnel (disponible, mission, arrêt, maintenance).
 */
export function VehicleStatusBadge({
  availability,
  label,
  className,
}: VehicleStatusBadgeProps) {
  const text =
    label ??
    ({
      available: "Disponible",
      on_mission: "En mission",
      stopped: "À l’arrêt",
      maintenance: "Maintenance",
    }[availability] as string);

  return (
    <Badge
      variant="outline"
      className={cn("font-medium", availabilityStyles[availability], className)}
    >
      {text}
    </Badge>
  );
}
