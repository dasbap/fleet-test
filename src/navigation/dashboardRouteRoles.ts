import type { AppRole } from "@/types/auth";

/** Aligné sur la sidebar web : finances réservées à l’organisateur. */
export const DASHBOARD_FINANCES_ROLES: AppRole[] = ["organizer"];

/** Rapports, équipes, invitations, chauffeurs : back-office flotte. */
export const DASHBOARD_BACKOFFICE_ROLES: AppRole[] = ["organizer", "manager"];

/** Encaissements (manager) ; l’organisateur peut aussi consulter. */
export const DASHBOARD_COLLECTIONS_ROLES: AppRole[] = ["organizer", "manager"];

/** Historique atelier / interventions. */
export const DASHBOARD_HISTORY_ROLES: AppRole[] = ["organizer", "manager", "mechanic"];
