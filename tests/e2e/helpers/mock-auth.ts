import type { Page } from '@playwright/test';

export const E2E_MOCK_ORG_ID = '11111111-1111-4111-8111-111111111111';
export const E2E_DEMO_FLEET_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

export async function enableMockAuthSession(page: Page): Promise<void> {
  await page.addInitScript(({ orgId, fleetId }) => {
    const nowIso = new Date().toISOString();
    window.localStorage.setItem('esamba-demo-auth-fallback', 'true');
    window.localStorage.setItem(
      'esamba-mock-auth-v1',
      JSON.stringify({
        user: {
          id: 'mock-e2e-user',
          email: 'organizer@esamba.test',
          created_at: nowIso,
          user_metadata: { full_name: 'E2E Organizer' },
        },
        role: 'organizer',
        memberships: [
          {
            id: 'mock-membership-e2e',
            fleet_id: fleetId,
            role: 'organizer',
            is_active: true,
          },
        ],
      }),
    );
    window.localStorage.setItem('esamba.active_fleet_id', fleetId);
    window.sessionStorage.setItem('esamba.e2e.mock_org_id', orgId);
  }, { orgId: E2E_MOCK_ORG_ID, fleetId: E2E_DEMO_FLEET_ID });
}

export async function activateMockAuthSession(page: Page): Promise<void> {
  await page.evaluate(({ orgId, fleetId }) => {
    const nowIso = new Date().toISOString();
    window.localStorage.setItem('esamba-demo-auth-fallback', 'true');
    window.localStorage.setItem(
      'esamba-mock-auth-v1',
      JSON.stringify({
        user: {
          id: 'mock-e2e-user',
          email: 'organizer@esamba.test',
          created_at: nowIso,
          user_metadata: { full_name: 'E2E Organizer' },
        },
        role: 'organizer',
        memberships: [
          {
            id: 'mock-membership-e2e',
            fleet_id: fleetId,
            role: 'organizer',
            is_active: true,
          },
        ],
      }),
    );
    window.localStorage.setItem('esamba.active_fleet_id', fleetId);
    window.sessionStorage.setItem('esamba.e2e.mock_org_id', orgId);
    window.dispatchEvent(new CustomEvent('esamba-auth-mode-changed'));
    window.dispatchEvent(new CustomEvent('esamba-mock-auth-changed'));
  }, { orgId: E2E_MOCK_ORG_ID, fleetId: E2E_DEMO_FLEET_ID });
}

export async function stubSupabaseNoise(page: Page): Promise<void> {
  await page.route('**/realtime/v1/**', route => route.abort());
  await page.route('**/auth/v1/**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
  );
}
