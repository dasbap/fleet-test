/**
 * Mode authentification : session mockée locale (tests / démo) ou Supabase.
 */
const DEMO_FALLBACK_STORAGE_KEY = "esamba-demo-auth-fallback";
export const AUTH_MODE_CHANGED_EVENT = "esamba-auth-mode-changed";

// Domaines de production — le mock ne peut jamais s'activer sur ces hostnames
const PROD_HOSTNAMES = ["www.e-samba.com", "e-samba.com", "app.e-samba.com"];

function isProductionHostname(): boolean {
  if (typeof window === "undefined") return false;
  return PROD_HOSTNAMES.includes(window.location.hostname);
}

function readDemoFallbackFlag(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(DEMO_FALLBACK_STORAGE_KEY) === "true";
}

export function isMockAuthEnabled(): boolean {
  // Double garde : hostname prod ET build flag PROD
  if (isProductionHostname()) return false;
  if (import.meta.env.PROD) return false;
  return import.meta.env.VITE_USE_MOCK_AUTH === "true" || readDemoFallbackFlag();
}

export function enableDemoAuthFallback(): void {
  if (isProductionHostname() || import.meta.env.PROD) {
    // Blocage PROD : tentative d'activation du mode mock en production → log sécurité
    console.error(
      "[SECURITY] enableDemoAuthFallback() appelé en production — opération refusée.",
      "Si vous voyez cette erreur, signalez-la immédiatement à l'équipe sécurité.",
    );
    return;
  }
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEMO_FALLBACK_STORAGE_KEY, "true");
  window.dispatchEvent(new CustomEvent(AUTH_MODE_CHANGED_EVENT));
}

export function disableDemoAuthFallback(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DEMO_FALLBACK_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(AUTH_MODE_CHANGED_EVENT));
}
