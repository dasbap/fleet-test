import { format } from "date-fns";
import { fr } from "date-fns/locale/fr";
import {
  AlertTriangle,
  ClipboardList,
  MapPin,
  MoreHorizontal,
  Truck,
  UserPlus,
  Wrench,
} from "lucide-react";
import type { FleetVehicleTimelineEvent } from "@/types/fleet-vehicle";
import { cn } from "@/lib/utils";

interface VehicleTimelineProps {
  events: FleetVehicleTimelineEvent[];
  className?: string;
}

function iconFor(type: FleetVehicleTimelineEvent["type"]) {
  const cls = "h-4 w-4 shrink-0";
  switch (type) {
    case "alert":
      return <AlertTriangle className={cn(cls, "text-warning")} aria-hidden />;
    case "maintenance":
      return <Wrench className={cn(cls, "text-primary")} aria-hidden />;
    case "mission":
      return <Truck className={cn(cls, "text-primary")} aria-hidden />;
    case "location":
      return <MapPin className={cn(cls, "text-muted-foreground")} aria-hidden />;
    case "assignment":
      return <UserPlus className={cn(cls, "text-success")} aria-hidden />;
    case "document":
      return <ClipboardList className={cn(cls, "text-muted-foreground")} aria-hidden />;
    default:
      return <MoreHorizontal className={cn(cls, "text-muted-foreground")} aria-hidden />;
  }
}

/**
 * Timeline verticale des événements véhicule (ordre : plus récent en haut).
 */
export function VehicleTimeline({ events, className }: VehicleTimelineProps) {
  const sorted = [...events].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
  );

  if (sorted.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-4 text-center">
        Aucun événement enregistré.
      </p>
    );
  }

  return (
    <ul className={cn("relative space-y-0", className)} role="list">
      <li
        className="absolute left-[11px] top-2 bottom-2 w-px bg-border"
        aria-hidden
      />
      {sorted.map((ev) => (
        <li key={ev.id} className="relative flex gap-3 pb-6 last:pb-0">
          <div
            className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-background"
            aria-hidden
          >
            {iconFor(ev.type)}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="font-medium text-sm leading-tight">{ev.title}</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              {format(new Date(ev.at), "d MMM yyyy à HH:mm", { locale: fr })}
            </p>
            {ev.description && (
              <p className="text-muted-foreground text-sm mt-1">{ev.description}</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
