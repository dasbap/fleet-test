import type { FleetVehicleTimelineEvent } from "@/types/fleet-vehicle";
import { demoIsoPast } from "@/mocks/demo/constants";

/** Événement timeline lié à un véhicule (journal d’exploitation). */
export interface DemoVehicleTimelineEvent extends FleetVehicleTimelineEvent {
  vehicleId: string;
}

/**
 * Événements répartis sur la flotte (missions, entretiens, alertes, géoloc).
 */
export const MOCK_VEHICLE_TIMELINE_EVENTS: DemoVehicleTimelineEvent[] = [
  { id: "tl-001", vehicleId: "veh-01", at: demoIsoPast(0, 2), type: "mission", title: "Départ mission livraison Plateau", description: "Conducteur : A. Diallo" },
  { id: "tl-002", vehicleId: "veh-01", at: demoIsoPast(1, 4), type: "location", title: "Position GPS actualisée", description: "Dakar — Plateau" },
  { id: "tl-003", vehicleId: "veh-01", at: demoIsoPast(3, 1), type: "maintenance", title: "Rappel entretien périodique", description: "Seuil km atteint à 90 %" },
  { id: "tl-004", vehicleId: "veh-02", at: demoIsoPast(0, 8), type: "assignment", title: "Véhicule désassigné", description: "Fin de location courte durée" },
  { id: "tl-005", vehicleId: "veh-02", at: demoIsoPast(14, 2), type: "maintenance", title: "Révision 90 000 km", description: "Toyota Thiès" },
  { id: "tl-006", vehicleId: "veh-03", at: demoIsoPast(0, 12), type: "alert", title: "Alerte assurance", description: "Échéance critique < 7 jours" },
  { id: "tl-007", vehicleId: "veh-03", at: demoIsoPast(2, 3), type: "location", title: "Immobilisation parc Pikine", description: "Attente pièce embrayage" },
  { id: "tl-008", vehicleId: "veh-04", at: demoIsoPast(0, 1), type: "maintenance", title: "Intervention groupe frigorifique", description: "Atelier froid — Dakar" },
  { id: "tl-009", vehicleId: "veh-04", at: demoIsoPast(5, 6), type: "document", title: "ATP frigorifique validé", description: "Prochain contrôle dans 12 mois" },
  { id: "tl-010", vehicleId: "veh-05", at: demoIsoPast(0, 0.3), type: "location", title: "En route Rufisque", description: "Mission active" },
  { id: "tl-011", vehicleId: "veh-05", at: demoIsoPast(1, 5), type: "mission", title: "Livraison tournée sud", description: "Réf. MIS-2026-014" },
  { id: "tl-012", vehicleId: "veh-06", at: demoIsoPast(2, 0), type: "alert", title: "Contrôle qualité terminé", description: "Aucune alerte ouverte — suivi atelier" },
  { id: "tl-013", vehicleId: "veh-06", at: demoIsoPast(20, 4), type: "maintenance", title: "Distribution", description: "Km 195 000" },
  { id: "tl-014", vehicleId: "veh-07", at: demoIsoPast(1, 2), type: "mission", title: "Collecte urbaine", description: "Tournée matinale" },
  { id: "tl-015", vehicleId: "veh-08", at: demoIsoPast(0, 6), type: "alert", title: "CT dépassé — véhicule réservé atelier", description: "Conformité" },
  { id: "tl-016", vehicleId: "veh-08", at: demoIsoPast(30, 0), type: "maintenance", title: "Freins et pneus", description: "Pneus centre commercial" },
  { id: "tl-017", vehicleId: "veh-09", at: demoIsoPast(4, 1), type: "assignment", title: "Affectation conducteur I. Sarr", description: "Mission longue durée" },
  { id: "tl-018", vehicleId: "veh-10", at: demoIsoPast(0, 9), type: "mission", title: "Transport palette — Thiès", description: "Chargement validé" },
  { id: "tl-019", vehicleId: "veh-10", at: demoIsoPast(7, 3), type: "document", title: "Échéance licence transport proche", description: "Relance conformité" },
  { id: "tl-020", vehicleId: "veh-11", at: demoIsoPast(10, 2), type: "location", title: "Retour dépôt", description: "Saint-Louis" },
  { id: "tl-021", vehicleId: "veh-12", at: demoIsoPast(1, 7), type: "maintenance", title: "Contrôle niveaux", description: "Préventif" },
  { id: "tl-022", vehicleId: "veh-12", at: demoIsoPast(45, 0), type: "other", title: "Révision constructeur", description: "Réseau agréé" },
];

export function getTimelineForVehicle(vehicleId: string): FleetVehicleTimelineEvent[] {
  return MOCK_VEHICLE_TIMELINE_EVENTS.filter((e) => e.vehicleId === vehicleId).map(
    ({ vehicleId: _v, ...rest }) => rest
  );
}
