/** UUID stable pour les scénarios Playwright onboarding (org mockée). */
export const DEFAULT_E2E_MOCK_ORG_ID = '11111111-1111-4111-8111-111111111111';

/** Mode E2E onboarding activé via `VITE_E2E_ONBOARDING=true` (serveur Playwright dédié). */
export function isE2eOnboardingMode(): boolean {
  return import.meta.env.VITE_E2E_ONBOARDING === 'true';
}

/** Organisation mockée injectée dans MockAuthProvider en mode E2E onboarding. */
export function getE2eMockOrgId(): string {
  const fromEnv = import.meta.env.VITE_MOCK_ORG_ID?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_E2E_MOCK_ORG_ID;
}
