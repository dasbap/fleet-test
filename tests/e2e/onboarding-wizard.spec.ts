import { expect, test, type Route } from '@playwright/test';
import {
  E2E_DEMO_FLEET_ID,
  E2E_MOCK_ORG_ID,
  enableMockAuthSession,
} from './helpers/mock-auth';

type JourneyState = {
  progressStep: 1 | 2 | 3 | 4;
  completed: boolean;
  stepsData: Record<string, unknown>;
};

function onboardingProgressBody(state: JourneyState) {
  return {
    id: 'onboarding-e2e',
    org_id: E2E_MOCK_ORG_ID,
    user_id: 'mock-e2e-user',
    step: state.progressStep,
    completed: state.completed,
    steps_data: state.stepsData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

async function fulfillOnboardingRoutes(route: Route, state: JourneyState): Promise<void> {
  const request = route.request();
  const url = request.url();
  const method = request.method();

  if (url.includes('/realtime/v1/')) {
    await route.abort();
    return;
  }

  if (url.includes('/auth/v1/')) {
    if (method === 'GET' && url.includes('/auth/v1/user')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'mock-e2e-user',
          aud: 'authenticated',
          role: 'authenticated',
          email: 'organizer@esamba.test',
        }),
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    return;
  }

  if (method === 'OPTIONS') {
    await route.fulfill({
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
      },
      body: '',
    });
    return;
  }

  if (method === 'GET' && url.includes('/rest/v1/flottes')) {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: E2E_DEMO_FLEET_ID,
          name: 'E-Samba Transport',
          org_id: E2E_MOCK_ORG_ID,
          organisations: { id: E2E_MOCK_ORG_ID, country_code: 'CM' },
        },
      ]),
    });
    return;
  }

  if (method === 'GET' && url.includes('/rest/v1/onboarding_progress')) {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(onboardingProgressBody(state)),
    });
    return;
  }

  if (
    (method === 'POST' || method === 'PATCH' || method === 'PUT')
    && url.includes('/rest/v1/onboarding_progress')
  ) {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(onboardingProgressBody(state)),
    });
    return;
  }

  if (method === 'POST' && url.includes('sauvegarder_progression_onboarding')) {
    try {
      const payload = request.postDataJSON() as {
        p_step?: number;
        p_steps_data?: Record<string, unknown>;
      };
      if (typeof payload?.p_step === 'number') {
        state.progressStep = Math.min(Math.max(payload.p_step, 1), 4) as JourneyState['progressStep'];
        if (payload.p_step < 4) {
          state.progressStep = Math.min(payload.p_step + 1, 4) as JourneyState['progressStep'];
        }
      }
      if (payload?.p_steps_data) {
        state.stepsData = { ...state.stepsData, ...payload.p_steps_data };
      }
    } catch {
      state.progressStep = Math.min(state.progressStep + 1, 4) as JourneyState['progressStep'];
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(onboardingProgressBody(state)),
    });
    return;
  }

  if (method === 'POST' && url.includes('finaliser_onboarding')) {
    state.completed = true;
    state.progressStep = 4;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(null),
    });
    return;
  }

  if (method === 'POST' && url.includes('creer_vehicule_esamba')) {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify('veh-1'),
    });
    return;
  }

  if (method === 'GET' && url.includes('/rest/v1/vehicules')) {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
    return;
  }

  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: '[]',
  });
}

test.describe('Onboarding wizard', () => {
  test('parcourt les 4 etapes avec tous les clics essentiels', async ({ page }) => {
    test.slow();
    const state: JourneyState = { progressStep: 1, completed: false, stepsData: {} };

    await enableMockAuthSession(page);
    await page.route(/\/(rest\/v1|auth\/v1|realtime\/v1)\//, route =>
      fulfillOnboardingRoutes(route, state),
    );

    // Pré-chauffe Vite (chunks lazy OnboardingRoute / wizard).
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.goto('/onboarding', { waitUntil: 'networkidle', timeout: 120_000 });
    await expect(page.getByText('Ajoutez votre premier véhicule')).toBeVisible({ timeout: 45_000 });

    await page.getByRole('button', { name: 'Passer' }).click();
    await expect(page.getByText('Activez vos alertes essentielles')).toBeVisible();
    await page.getByRole('button', { name: 'Retour' }).click();
    await expect(page.getByText('Ajoutez votre premier véhicule')).toBeVisible();

    await page.getByPlaceholder('AB 123 CD').fill('AB 123 CD');
    await page.getByRole('combobox').selectOption('Toyota');
    await page.getByRole('button', { name: 'Pick-up' }).click();
    state.progressStep = 2;
    await page.getByRole('button', { name: 'Continuer' }).click();

    await expect(page.getByText('Activez vos alertes essentielles')).toBeVisible();
    await page.getByLabel("Activer l'alerte Huile").click();
    await page.getByRole('button', { name: 'Continuer' }).click();
    state.progressStep = 3;

    await expect(page.getByText('Invitez votre équipe')).toBeVisible();
    await page.getByPlaceholder('membre@exemple.com').fill('membre@exemple.com');
    await page.keyboard.press('Enter');
    await expect(page.getByText('membre@exemple.com')).toBeVisible();
    await page.getByRole('button', { name: 'Continuer' }).click();
    state.progressStep = 4;

    await expect(page.getByText('Validation finale')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Terminer' })).toBeDisabled();
    await page.getByRole('checkbox').click();
    await page.getByRole('button', { name: 'Terminer' }).click();

    await expect(page).toHaveURL(/\/dashboard(\/)?$/);
  });
});
