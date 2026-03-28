/**
 * Mode authentification : session mockée locale (tests / démo) ou Supabase.
 */
export function isMockAuthEnabled(): boolean {
  return import.meta.env.VITE_USE_MOCK_AUTH === "true";
}
