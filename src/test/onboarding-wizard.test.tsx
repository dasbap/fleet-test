import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';

const mockNavigate = vi.fn();
const mockSaveStep1 = vi.fn();
const mockSaveStep = vi.fn();
const mockComplete = vi.fn();
const mockTrackEvent = vi.fn();

const progress = {
  step: 1 as const,
  completed: false,
  steps_data: {},
};

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ orgId: 'org-1' }),
}));

vi.mock('@/hooks/useOnboarding', () => ({
  useOnboarding: () => ({
    data: progress,
    saveStep: mockSaveStep,
    saveStep1: mockSaveStep1,
    complete: mockComplete,
    isSaving: false,
    isCompleting: false,
  }),
}));

vi.mock('@/hooks/useFunnelTelemetry', () => ({
  useTrackFunnelEvent: () => ({ trackEvent: mockTrackEvent }),
}));

describe('OnboardingWizard', () => {
  beforeEach(() => {
    progress.step = 1;
    progress.steps_data = {};
    mockNavigate.mockReset();
    mockSaveStep1.mockReset().mockResolvedValue(undefined);
    mockSaveStep.mockReset().mockResolvedValue(undefined);
    mockComplete.mockReset().mockResolvedValue(undefined);
    mockTrackEvent.mockReset();
  });

  it('termine le parcours complet 1->4', async () => {
    render(
      <MemoryRouter>
        <OnboardingWizard />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText('AB 123 CD'), { target: { value: 'AB 123 CD' } });
    fireEvent.change(screen.getByDisplayValue('Sélectionner'), { target: { value: 'Toyota' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pick-up' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));

    await waitFor(() => expect(mockSaveStep1).toHaveBeenCalledOnce());
    await screen.findByText('Activez vos alertes essentielles');

    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    await waitFor(() => expect(mockSaveStep).toHaveBeenCalledWith(2, expect.any(Object)));

    await screen.findByText('Invitez votre équipe');
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    await waitFor(() => expect(mockSaveStep).toHaveBeenCalledWith(3, expect.any(Object)));

    await screen.findByText('Validation finale');
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Terminer' }));

    await waitFor(() => expect(mockComplete).toHaveBeenCalledOnce());
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });

  it('permet de passer l etape 1', async () => {
    render(
      <MemoryRouter>
        <OnboardingWizard />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Passer' }));
    await waitFor(() => expect(mockSaveStep).toHaveBeenCalledWith(1, {}));
    await screen.findByText('Activez vos alertes essentielles');
  });

  it('permet un retour de l etape 3 vers l etape 2', async () => {
    progress.step = 3;
    progress.steps_data = {
      step2: { alerts: { oil: true, revision: false, tires: true, brakes: false } },
    };

    render(
      <MemoryRouter>
        <OnboardingWizard />
      </MemoryRouter>,
    );

    await screen.findByText('Invitez votre équipe');
    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));
    await screen.findByText('Activez vos alertes essentielles');
  });

  it('bloque la validation finale sans confirmation', async () => {
    progress.step = 4;

    render(
      <MemoryRouter>
        <OnboardingWizard />
      </MemoryRouter>,
    );

    const finishButton = await screen.findByRole('button', { name: 'Terminer' });
    expect(finishButton).toBeDisabled();
    fireEvent.click(finishButton);
    expect(mockComplete).not.toHaveBeenCalled();
  });
});
