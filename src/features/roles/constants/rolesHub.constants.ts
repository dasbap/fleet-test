import type { Permission } from "@/types/rbac";
import type { RoleType } from "@/repositories/fleet-member.repository";

export const ROLE_LABELS: Record<RoleType, string> = {
  organizer: "Organisateur",
  manager: "Manager",
  mechanic: "Mécanicien",
  driver: "Conducteur",
};

export const ROLE_COLORS: Record<RoleType, string> = {
  organizer: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  manager: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  mechanic: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  driver: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

export const PERMISSION_GROUPS: { label: string; permissions: Permission[] }[] = [
  { label: "Flotte", permissions: ["fleet.view", "fleet.create", "fleet.update", "fleet.delete"] },
  { label: "Véhicules", permissions: ["vehicle.view", "vehicle.create", "vehicle.update", "vehicle.delete", "vehicle.assign_driver"] },
  { label: "Membres", permissions: ["member.view", "member.invite", "member.remove", "member.update_role"] },
  { label: "Maintenance", permissions: ["maintenance.view", "maintenance.create", "maintenance.update", "maintenance.delete"] },
  { label: "Affectations", permissions: ["assignment.view_own", "assignment.view_all", "assignment.manage"] },
  { label: "Rapports", permissions: ["report.view", "report.export"] },
  { label: "Facturation", permissions: ["billing.view", "billing.manage"] },
  { label: "DVIR", permissions: ["dvir.submit", "dvir.view_all"] },
  { label: "Organisation", permissions: ["org.settings", "org.manage"] },
];

export const PERMISSION_LABELS: Partial<Record<Permission, string>> = {
  "fleet.view": "Voir la flotte", "fleet.create": "Créer", "fleet.update": "Modifier", "fleet.delete": "Supprimer",
  "vehicle.view": "Voir", "vehicle.create": "Ajouter", "vehicle.update": "Modifier", "vehicle.delete": "Supprimer", "vehicle.assign_driver": "Affecter conducteur",
  "member.view": "Voir", "member.invite": "Inviter", "member.remove": "Retirer", "member.update_role": "Changer rôle",
  "maintenance.view": "Voir", "maintenance.create": "Créer", "maintenance.update": "Modifier", "maintenance.delete": "Supprimer",
  "assignment.view_own": "Ses affectations", "assignment.view_all": "Toutes", "assignment.manage": "Gérer",
  "report.view": "Voir", "report.export": "Exporter",
  "billing.view": "Voir", "billing.manage": "Gérer",
  "dvir.submit": "Soumettre", "dvir.view_all": "Voir tous",
  "org.settings": "Paramètres", "org.manage": "Gérer",
};

export const FLEET_ROLES: RoleType[] = ["organizer", "manager", "mechanic", "driver"];
