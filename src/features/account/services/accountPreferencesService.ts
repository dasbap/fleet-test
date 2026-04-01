import type {
  AccountLanguageCode,
  AccountSyncDisplayStatus,
} from "@/types/account-preferences";
import {
  getAccountPreferencesSnapshot,
  setAccountLanguage,
  setNotificationsEnabled,
} from "@/features/account/store/accountPreferencesStore";
import { setLocalSyncDisplayStatus } from "@/lib/storage/flotteEsambaLocalCache";

/**
 * Couche service — aujourd’hui : store local simulé.
 * Remplacer les méthodes par des appels HTTP (ex. `fetch('/api/me/preferences')`) sans changer les composants.
 */
export class AccountPreferencesService {
  getSnapshot() {
    return getAccountPreferencesSnapshot();
  }

  async updateNotifications(enabled: boolean): Promise<void> {
    setNotificationsEnabled(enabled);
    // await api.patch('/me/preferences', { notificationsEnabled: enabled });
  }

  async updateLanguage(lang: AccountLanguageCode): Promise<void> {
    setAccountLanguage(lang);
    // await api.patch('/me/preferences', { language: lang });
  }

  async reportSyncStatus(status: AccountSyncDisplayStatus): Promise<void> {
    setLocalSyncDisplayStatus(status);
    // Optionnel : POST /api/sync/heartbeat côté serveur
  }
}

export const accountPreferencesService = new AccountPreferencesService();
