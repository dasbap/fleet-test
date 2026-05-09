import type { AppRole } from "@/hooks/useAuth";

/** Labels français pour l'affichage des rôles */
export const ROLE_LABELS: Record<AppRole, string> = {
  organizer: "Organisateur",
  manager: "Gestionnaire",
  driver: "Chauffeur",
  mechanic: "Mécanicien",
};

/** Classes Tailwind pour le badge selon le rôle */
export const ROLE_BADGE_CLASSES: Record<AppRole, string> = {
  organizer: "bg-chart-1 text-primary-foreground",
  manager: "bg-chart-2 text-primary-foreground",
  driver: "bg-chart-3 text-primary-foreground",
  mechanic: "bg-chart-4 text-primary-foreground",
};

const DEFAULT_BADGE_CLASS = "bg-muted";

/**
 * Retourne le label affichable pour un rôle (ou la clé si rôle inconnu).
 */
export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role as AppRole] ?? role;
}

/**
 * Retourne les classes CSS du badge pour un rôle (ou défaut muted).
 */
export function getRoleBadgeClass(role: string): string {
  return ROLE_BADGE_CLASSES[role as AppRole] ?? DEFAULT_BADGE_CLASS;
}
