/**
 * Préférences compte mobile — prêtes pour persistance API (PATCH /me/preferences).
 */

export type AccountLanguageCode = "fr" | "en";

/** État affiché pour la synchronisation hors ligne (côté client). */
export type AccountSyncDisplayStatus =
  | "synced"
  | "syncing"
  | "pending"
  | "error";

export interface AccountPreferencesState {
  notificationsEnabled: boolean;
  language: AccountLanguageCode;
}
