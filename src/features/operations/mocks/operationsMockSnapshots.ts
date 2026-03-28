/**
 * Données de démonstration cohérentes pour le module Opérations (Flotte E-Samba).
 * Utilisées lorsque `VITE_OPERATIONS_MOCK=true` (voir `operations.service.ts`).
 */
import { getDefaultDriverChecklists } from "@/features/operations/mocks/operationsMock";
import type {
  OrganizerOperationsMock,
  ManagerOperationsMock,
  MockDriverDay,
  MechanicOperationsMock,
} from "@/features/operations/mocks/operationsMock";

export const organizerOperationsMockSnapshot: OrganizerOperationsMock = {
  missionsToday: [
    {
      id: "snap-m1",
      title: "Tournée Brazzaville — Pointe-Noire",
      subtitle: "Ligne fret express",
      vehicleLabel: "Mercedes Actros",
      driverName: "Jean M.",
      timeWindow: "06:00 – 14:00",
      status: "in_progress",
      href: "/dashboard/closure",
    },
    {
      id: "snap-m2",
      title: "Collecte urbaine secteur nord",
      subtitle: "3 arrêts planifiés",
      vehicleLabel: "Iveco Daily",
      driverName: "Marie K.",
      timeWindow: "08:30 – 12:00",
      status: "planned",
      href: "/dashboard/closure",
    },
  ],
  vehiclesInService: [
    {
      id: "snap-v1",
      label: "Mercedes Actros · CG-452-AB",
      driver: "Jean M.",
      route: "Avenue de la République → Zone industrielle",
    },
    {
      id: "snap-v2",
      label: "Iveco Daily · CG-891-XY",
      driver: "Marie K.",
      route: "Quartier nord — boucle matinale",
    },
    {
      id: "snap-v3",
      label: "Renault Master · CG-102-ZZ",
      driver: "Paul N.",
      route: "Livraisons centre-ville",
    },
  ],
  operationalIncidents: [
    {
      id: "snap-i1",
      title: "Freinage anormal — patinage",
      subtitle: "Signalé ce matin",
      vehicleLabel: "Iveco Daily",
      driverName: "Marie K.",
      timeWindow: "Priorité haute",
      status: "attention",
      href: "/dashboard/incidents",
    },
    {
      id: "snap-i2",
      title: "Vitre latérale fissurée",
      vehicleLabel: "Renault Master",
      timeWindow: "Suivi sécurité",
      status: "in_progress",
      href: "/dashboard/incidents",
    },
  ],
  assignedTasks: [
    {
      id: "snap-t1",
      label: "Valider les clôtures de créneau (hier)",
      assignee: "Régulation",
      dueLabel: "Avant 18:00",
      status: "attention",
      href: "/dashboard/closure",
    },
    {
      id: "snap-t2",
      label: "Relancer maintenance préventive tracteur #2",
      assignee: "Atelier",
      dueLabel: "Cette semaine",
      status: "planned",
      href: "/dashboard/maintenance",
    },
  ],
};

export const managerOperationsMockSnapshot: ManagerOperationsMock = {
  summary: [
    { label: "Véhicules opérationnels", value: "18", hint: "22 véhicules au total dans le parc" },
    { label: "Incidents ouverts", value: "4", hint: "À traiter ou en suivi" },
    { label: "Interventions atelier", value: "6", hint: "En file ou en cours" },
  ],
  incidents: [
    {
      id: "snap-mg-i1",
      title: "Perte liquide de refroidissement",
      vehicleLabel: "Mercedes Actros (CG-452-AB)",
      severity: "critical",
      impact: "Immobilisation possible — 3 véhicules même ligne",
      href: "/dashboard/incidents",
    },
    {
      id: "snap-mg-i2",
      title: "Retard récurrent sur tournée nord",
      vehicleLabel: "Parc secteur nord",
      severity: "high",
      impact: "Charge opérationnelle et image client",
      href: "/dashboard/incidents",
    },
  ],
  scheduledMaintenance: [
    {
      id: "snap-sm1",
      vehicleLabel: "Iveco Daily",
      label: "Vidange + filtres",
      scheduledLabel: "Demain · 09:00",
      status: "planned",
      href: "/dashboard/maintenance",
    },
    {
      id: "snap-sm2",
      vehicleLabel: "Renault Master",
      label: "Contrôle freinage",
      scheduledLabel: "Jeudi · 14:00",
      status: "planned",
      href: "/dashboard/maintenance",
    },
  ],
};

const { departureChecklist, arrivalChecklist } = getDefaultDriverChecklists();

export const driverOperationsMockSnapshot: MockDriverDay = {
  missionTitle: "Livraison Plateau — Mfilou",
  missionRoute: "Départ dépôt 06:30 · 4 arrêts clients · retour estimé 15:00",
  missionStatus: "in_progress",
  missionTime: "Créneau ouvert · km départ 128 420",
  vehicleLabel: "Mercedes Sprinter",
  vehiclePlate: "CG-204-AA",
  vehicleKm: "128 420 km",
  departureChecklist,
  arrivalChecklist,
};

export const mechanicOperationsMockSnapshot: MechanicOperationsMock = {
  interventionsToday: [
    {
      id: "snap-me1",
      vehicleLabel: "Mercedes Actros",
      plate: "CG-452-AB",
      priority: "high",
      status: "in_progress",
      diagnostic: "Fuite joint collecteur — fumée à froid. Compression OK au test rapide.",
      actionsDone: ["Dépose collecteur", "Nettoyage surfaces", "Commande joint + visserie"],
      canClose: false,
      href: "/dashboard/maintenance",
    },
    {
      id: "snap-me2",
      vehicleLabel: "Iveco Daily",
      plate: "CG-891-XY",
      priority: "medium",
      status: "in_progress",
      diagnostic: "Voyant ABS intermittent — lecture codes défaut C0035.",
      actionsDone: ["Remplacement capteur AR droit", "Reset calculateur"],
      canClose: true,
      href: "/dashboard/maintenance",
    },
    {
      id: "snap-me3",
      vehicleLabel: "Renault Master",
      plate: "CG-102-ZZ",
      priority: "low",
      status: "completed",
      diagnostic: "Contrôle visuel post-incident vitre — pas d’impact structure.",
      actionsDone: ["Remplacement vitre", "Test étanchéité cabine"],
      canClose: true,
      href: "/dashboard/maintenance",
    },
  ],
};
