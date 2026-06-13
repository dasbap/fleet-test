const ROLE_LABELS: Record<string, string> = {
  organizer: "Organisateur",
  manager: "Gestionnaire",
  mechanic: "Mécanicien",
  driver: "Conducteur",
  admin: "Administrateur",
};

export function formatFleetRole(role: string | null | undefined): string {
  if (!role) return "Membre";
  return ROLE_LABELS[role] ?? role;
}

export function canManageVehicles(role: string): boolean {
  return ["organizer", "manager", "admin"].includes(role);
}

export function canDeleteVehicles(role: string): boolean {
  return ["organizer", "admin"].includes(role);
}

export function canManageBilling(role: string): boolean {
  return ["organizer", "admin"].includes(role);
}

export function canExportReports(role: string): boolean {
  return ["organizer", "manager", "admin"].includes(role);
}
