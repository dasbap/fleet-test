/**
 * Mode authentification : session mockée locale (tests / démo) ou Supabase.
 */
const DEMO_FALLBACK_STORAGE_KEY = "esamba-demo-auth-fallback";
export const AUTH_MODE_CHANGED_EVENT = "esamba-auth-mode-changed";

function readDemoFallbackFlag(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(DEMO_FALLBACK_STORAGE_KEY) === "true";
}

export function isMockAuthEnabled(): boolean {
  return import.meta.env.VITE_USE_MOCK_AUTH === "true" || readDemoFallbackFlag();
}

export function enableDemoAuthFallback(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEMO_FALLBACK_STORAGE_KEY, "true");
  window.dispatchEvent(new CustomEvent(AUTH_MODE_CHANGED_EVENT));
}

export function disableDemoAuthFallback(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DEMO_FALLBACK_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(AUTH_MODE_CHANGED_EVENT));
}
