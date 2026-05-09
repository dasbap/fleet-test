import { AlertTriangle, Car, Wrench } from "lucide-react";
import type { AppRole } from "@/hooks/useAuth";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import type { QuickActionItem } from "./MobileQuickActions";

/** Actions rapides et routes selon le rôle (aligné sur App.tsx). */
export function getQuickActionsForRole(role: AppRole | null): QuickActionItem[] {
  const r = role ?? "organizer";
  const fleetPath =
    r === "driver" ? ROUTE_PATHS.dashboardMyVehicle : ROUTE_PATHS.dashboardVehicles;

  return [
    {
      to: `${ROUTE_PATHS.dashboardIncidents}/declare`,
      label: "Déclarer incident",
      description: "Signaler un incident rapidement",
      icon: AlertTriangle,
    },
    {
      to: fleetPath,
      label: "Voir flotte",
      description: r === "driver" ? "Consulter votre véhicule assigné" : "Consulter la flotte",
      icon: Car,
    },
    {
      to: ROUTE_PATHS.dashboardMaintenance,
      label: "Créer une intervention",
      description: "Ouvrir une demande atelier",
      icon: Wrench,
    },
  ];
}
