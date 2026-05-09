import { useCallback } from "react";
import type { AccountLanguageCode } from "@/types/account-preferences";
import { accountPreferencesService } from "@/features/account/services/accountPreferencesService";
import { useAccountPreferencesState } from "@/features/account/store/accountPreferencesStore";

/**
 * Hook préférences — délègue au service (mock → API plus tard).
 */
export function useAccountPreferences() {
  const prefs = useAccountPreferencesState();

  const setNotifications = useCallback(async (enabled: boolean) => {
    await accountPreferencesService.updateNotifications(enabled);
  }, []);

  const setLanguage = useCallback(async (lang: AccountLanguageCode) => {
    await accountPreferencesService.updateLanguage(lang);
  }, []);

  return {
    ...prefs,
    setNotifications,
    setLanguage,
  };
}
