import type { IncidentAlertAssignee } from "@/types/incident-alert";
import { MOCK_DEMO_USERS } from "@/mocks/demo/users";

function toIncidentAssignee(userId: string): IncidentAlertAssignee {
  const u = MOCK_DEMO_USERS.find((x) => x.id === userId);
  if (!u) throw new Error(`Utilisateur démo introuvable: ${userId}`);
  return {
    id: u.id,
    fullName: u.fullName,
    role: u.jobTitle,
    phone: u.phone,
  };
}

/** Marie (gestion), Ibrahima (mécano), Cheikh (direction) — affectations alertes. */
export const DEMO_INCIDENT_ASSIGNEES: IncidentAlertAssignee[] = [
  toIncidentAssignee("usr-02"),
  toIncidentAssignee("usr-03"),
  toIncidentAssignee("usr-01"),
];
