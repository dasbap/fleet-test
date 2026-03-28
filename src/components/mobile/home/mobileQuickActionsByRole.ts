import { AlertTriangle, Car, Wrench } from "lucide-react";
import type { AppRole } from "@/hooks/useAuth";
import type { QuickActionItem } from "./MobileQuickActions";

/** Actions rapides et routes selon le rôle (aligné sur App.tsx). */
export function getQuickActionsForRole(role: AppRole | null): QuickActionItem[] {
  const r = role ?? "organizer";

  if (r === "driver") {
    return [
      {
        to: "/dashboard/incidents/declare",
        label: "Déclarer un incident",
        description: "Signalement terrain",
        icon: AlertTriangle,
      },
      {
        to: "/dashboard/my-vehicle",
        label: "Voir mon véhicule",
        description: "Véhicule assigné",
        icon: Car,
      },
      {
        to: "/dashboard/maintenance",
        label: "Demander une intervention",
        description: "Atelier / maintenance",
        icon: Wrench,
      },
    ];
  }

  if (r === "mechanic") {
    return [
      {
        to: "/dashboard/maintenance",
        label: "Interventions",
        description: "Atelier / maintenance",
        icon: Wrench,
      },
      {
        to: "/dashboard/vehicles",
        label: "Voir la flotte",
        description: "Véhicules et statuts",
        icon: Car,
      },
    ];
  }

  return [
    {
      to: "/dashboard/incidents/declare",
      label: "Déclarer un incident",
      description: "Signalement sécurisé",
      icon: AlertTriangle,
    },
    {
      to: "/dashboard/vehicles",
      label: "Voir la flotte",
      description: "Véhicules et statuts",
      icon: Car,
    },
    {
      to: "/dashboard/maintenance",
      label: "Créer une intervention",
      description: "Atelier et maintenance",
      icon: Wrench,
    },
  ];
}
