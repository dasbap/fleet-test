import type { Mission, MissionStep } from "@/types/mission";
import { DEMO_FLEET_ID } from "@/mocks/demo/constants";
import { demoIsoFuture, demoIsoPast } from "@/mocks/demo/constants";

/**
 * Missions opérationnelles — statuts alignés véhicules / conducteurs démo.
 */
export const MOCK_DEMO_MISSIONS: Mission[] = [
  {
    id: "mis-01",
    fleetId: DEMO_FLEET_ID,
    title: "Livraison multi-stop — Plateau & Almadies",
    reference: "MIS-2026-014",
    status: "in_progress",
    vehicleId: "veh-01",
    driverUserId: "usr-05",
    scheduledStart: demoIsoPast(0, 3),
    scheduledEnd: demoIsoFuture(0, 5),
    createdAt: demoIsoPast(1, 2),
    updatedAt: demoIsoPast(0, 0.5),
  },
  {
    id: "mis-02",
    fleetId: DEMO_FLEET_ID,
    title: "Collecte palettes — zone industrielle Thiès",
    reference: "MIS-2026-009",
    status: "completed",
    vehicleId: "veh-10",
    driverUserId: "usr-06",
    scheduledStart: demoIsoPast(1, 6),
    scheduledEnd: demoIsoPast(1, 1),
    createdAt: demoIsoPast(2, 0),
    updatedAt: demoIsoPast(1, 0.5),
  },
  {
    id: "mis-03",
    fleetId: DEMO_FLEET_ID,
    title: "Transfert entrepôt — Saint-Louis",
    reference: "MIS-2026-021",
    status: "assigned",
    vehicleId: "veh-11",
    driverUserId: null,
    scheduledStart: demoIsoFuture(1, 8),
    scheduledEnd: demoIsoFuture(1, 16),
    createdAt: demoIsoPast(0, 4),
    updatedAt: demoIsoPast(0, 4),
  },
  {
    id: "mis-04",
    fleetId: DEMO_FLEET_ID,
    title: "Tournée minibus — écoles Dakar",
    reference: "MIS-2026-003",
    status: "in_progress",
    vehicleId: "veh-12",
    driverUserId: "usr-09",
    scheduledStart: demoIsoPast(0, 3),
    scheduledEnd: demoIsoFuture(0, 4),
    createdAt: demoIsoPast(1, 0),
    updatedAt: demoIsoPast(0, 1),
  },
  {
    id: "mis-05",
    fleetId: DEMO_FLEET_ID,
    title: "Livraison express — Rufisque",
    reference: "MIS-2026-018",
    status: "in_progress",
    vehicleId: "veh-05",
    driverUserId: "usr-08",
    scheduledStart: demoIsoPast(0, 3),
    scheduledEnd: demoIsoFuture(0, 2),
    createdAt: demoIsoPast(0, 5),
    updatedAt: demoIsoPast(0, 0.2),
  },
  {
    id: "mis-06",
    fleetId: DEMO_FLEET_ID,
    title: "Rotation frigo — client grande distribution",
    reference: "MIS-2026-011",
    status: "assigned",
    vehicleId: "veh-04",
    driverUserId: "usr-04",
    scheduledStart: demoIsoFuture(0, 14),
    scheduledEnd: demoIsoFuture(0, 20),
    createdAt: demoIsoPast(1, 1),
    updatedAt: demoIsoPast(0, 8),
  },
  {
    id: "mis-07",
    fleetId: DEMO_FLEET_ID,
    title: "Mission annulée — client indisponible",
    reference: "MIS-2026-007",
    status: "cancelled",
    vehicleId: "veh-02",
    driverUserId: null,
    scheduledStart: demoIsoPast(3, 9),
    scheduledEnd: demoIsoPast(3, 11),
    createdAt: demoIsoPast(4, 0),
    updatedAt: demoIsoPast(3, 8),
  },
  {
    id: "mis-08",
    fleetId: DEMO_FLEET_ID,
    title: "Transport urgence pièces — atelier",
    reference: "MIS-2026-025",
    status: "draft",
    vehicleId: "veh-09",
    driverUserId: null,
    scheduledStart: demoIsoFuture(0, 18),
    scheduledEnd: demoIsoFuture(0, 21),
    createdAt: demoIsoPast(0, 2),
    updatedAt: demoIsoPast(0, 2),
  },
];

export const MOCK_DEMO_MISSION_STEPS: MissionStep[] = [
  { id: "stp-01", missionId: "mis-01", order: 1, label: "Chargement entrepôt", done: true },
  { id: "stp-02", missionId: "mis-01", order: 2, label: "Livraison client A", done: true },
  { id: "stp-03", missionId: "mis-01", order: 3, label: "Livraison client B", done: false },
  { id: "stp-04", missionId: "mis-02", order: 1, label: "Chargement", done: true },
  { id: "stp-05", missionId: "mis-02", order: 2, label: "Déchargement Thiès", done: true },
  { id: "stp-06", missionId: "mis-05", order: 1, label: "Prise en charge colis", done: true },
  { id: "stp-07", missionId: "mis-05", order: 2, label: "Livraison finale", done: false },
];

export function getStepsForMission(missionId: string): MissionStep[] {
  return MOCK_DEMO_MISSION_STEPS.filter((s) => s.missionId === missionId).sort(
    (a, b) => a.order - b.order
  );
}
