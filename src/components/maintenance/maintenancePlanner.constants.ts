import type {
  MaintenanceTypeUi,
  PlanPriorityUi,
} from "./maintenancePlannerPayload";

export interface Prestataire {
  id: string;
  name: string;
  location: string;
  rating: number;
  availability: string;
}

export interface CheckItem {
  id: string;
  label: string;
  priceXaf: number;
  checked: boolean;
  mandatory?: boolean;
}

export const PRIORITY_OPTIONS: { value: PlanPriorityUi; label: string }[] = [
  { value: "critical", label: "Critique — immédiat" },
  { value: "high", label: "Haute — cette semaine" },
  { value: "normal", label: "Normale — ce mois" },
  { value: "low", label: "Faible — planifié" },
];

export const DURATION_OPTIONS = [
  { value: 2, label: "2 heures" },
  { value: 4, label: "4 heures (demi-journée)" },
  { value: 8, label: "Journée complète" },
  { value: 16, label: "2 jours" },
];

export const DEFAULT_REVISION_ITEMS: Omit<CheckItem, "id">[] = [
  { label: "Vidange huile moteur + filtre", priceXaf: 85_000, checked: true, mandatory: true },
  { label: "Filtre à air", priceXaf: 25_000, checked: true },
  { label: "Filtre habitacle", priceXaf: 20_000, checked: true },
  { label: "Contrôle liquides (frein, refroid., dir.)", priceXaf: 45_000, checked: true },
  { label: "Contrôle freins + étriers", priceXaf: 35_000, checked: false },
  { label: "Courroie de distribution", priceXaf: 180_000, checked: false },
  { label: "Diagnostic électronique OBD", priceXaf: 15_000, checked: true },
  { label: "Contrôle géométrie", priceXaf: 30_000, checked: false },
];

export const DEFAULT_PRESTATAIRES: Prestataire[] = [
  { id: "p1", name: "Garage Auto Elite", location: "Yaounde Centre", rating: 5, availability: "Disponible aujourd'hui" },
  { id: "p2", name: "Atelier Toyota CM", location: "Yaounde, bd de l'URSS", rating: 4, availability: "Disponible demain matin" },
  { id: "p3", name: "Centre Revision Express", location: "Douala, Akwa", rating: 3, availability: "Disponible dans 3 jours" },
];

export const MAINTENANCE_TYPE_DEFAULT: MaintenanceTypeUi = "revision";
