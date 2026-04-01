import type { FleetRole } from "./role";

/**
 * Utilisateur métier (couche domaine), distinct du User Supabase Auth.
 */
export interface FleetUser {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  /** Rôle effectif courant dans la flotte sélectionnée (si applicable). */
  activeFleetRole: FleetRole | null;
  /** Flotte active pour le contexte mobile / dashboard. */
  activeFleetId: string | null;
  updatedAt: string;
}

export interface FleetUserPreferences {
  userId: string;
  locale: "fr" | "en";
  notificationsEnabled: boolean;
}

/** Alias du modèle utilisateur métier (évite la confusion avec AuthUser / session). */
export type User = FleetUser;
