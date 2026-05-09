import type { AppRole } from "@/types/auth";
import type { FleetMembership } from "@/types/auth";
import { DEMO_FLEET_ID } from "@/mocks/demo/constants";

/**
 * Libellés métier des rôles applicatifs (affichage / formation).
 */
export const DEMO_ROLE_LABELS: Record<AppRole, string> = {
  organizer: "Organisateur — pilotage et conformité",
  manager: "Gestionnaire — planning et affectations",
  driver: "Conducteur — missions et véhicule assigné",
  mechanic: "Mécanicien — interventions et diagnostics",
};

/** Adhésion flotte liée à un utilisateur démo (traçabilité). */
export interface DemoFleetMembership extends FleetMembership {
  userId: string;
}

export const MOCK_DEMO_MEMBERSHIPS: DemoFleetMembership[] = [
  { id: "mem-01", userId: "usr-01", fleet_id: DEMO_FLEET_ID, role: "organizer", is_active: true },
  { id: "mem-02", userId: "usr-02", fleet_id: DEMO_FLEET_ID, role: "manager", is_active: true },
  { id: "mem-03", userId: "usr-03", fleet_id: DEMO_FLEET_ID, role: "mechanic", is_active: true },
  { id: "mem-04", userId: "usr-04", fleet_id: DEMO_FLEET_ID, role: "mechanic", is_active: true },
  { id: "mem-05", userId: "usr-05", fleet_id: DEMO_FLEET_ID, role: "driver", is_active: true },
  { id: "mem-06", userId: "usr-06", fleet_id: DEMO_FLEET_ID, role: "driver", is_active: true },
  { id: "mem-07", userId: "usr-07", fleet_id: DEMO_FLEET_ID, role: "driver", is_active: true },
  { id: "mem-08", userId: "usr-08", fleet_id: DEMO_FLEET_ID, role: "driver", is_active: true },
  { id: "mem-09", userId: "usr-09", fleet_id: DEMO_FLEET_ID, role: "driver", is_active: true },
  { id: "mem-10", userId: "usr-10", fleet_id: DEMO_FLEET_ID, role: "manager", is_active: true },
  { id: "mem-11", userId: "usr-11", fleet_id: DEMO_FLEET_ID, role: "organizer", is_active: true },
  { id: "mem-12", userId: "usr-12", fleet_id: DEMO_FLEET_ID, role: "mechanic", is_active: true },
];

/** Compatibilité hooks attendant `FleetMembership[]` sans userId. */
export const MOCK_FLEET_MEMBERSHIPS: FleetMembership[] = MOCK_DEMO_MEMBERSHIPS.map(
  ({ userId: _u, ...m }) => m
);
