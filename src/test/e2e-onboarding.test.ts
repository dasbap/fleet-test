import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_E2E_MOCK_ORG_ID, getE2eMockOrgId, isE2eOnboardingMode } from '@/lib/e2e-onboarding';

describe('e2e-onboarding', () => {
  it('detecte le mode E2E onboarding via VITE_E2E_ONBOARDING', () => {
    vi.stubEnv('VITE_E2E_ONBOARDING', 'true');
    expect(isE2eOnboardingMode()).toBe(true);
    vi.stubEnv('VITE_E2E_ONBOARDING', 'false');
    expect(isE2eOnboardingMode()).toBe(false);
  });

  it('retourne un orgId stable par defaut', () => {
    vi.stubEnv('VITE_MOCK_ORG_ID', '');
    expect(getE2eMockOrgId()).toBe(DEFAULT_E2E_MOCK_ORG_ID);
  });

  it('priorise VITE_MOCK_ORG_ID si defini', () => {
    vi.stubEnv('VITE_MOCK_ORG_ID', '22222222-2222-4222-8222-222222222222');
    expect(getE2eMockOrgId()).toBe('22222222-2222-4222-8222-222222222222');
  });
});
