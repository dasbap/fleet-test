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
  step: 1,
  completed: false,
  steps_data: {} as Record<string, unknown>,
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

  it('termine le parcours simplifie flotte puis validation', async () => {
    render(
      <MemoryRouter>
        <OnboardingWizard />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText('ex: LT 456 A CM'), { target: { value: 'LT 456 A' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));

    await waitFor(() => expect(mockSaveStep1).toHaveBeenCalledOnce());
    await screen.findByText('Validation finale');

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Terminer' }));

    await waitFor(() => expect(mockSaveStep).toHaveBeenCalledWith(4, { step4: { confirmed: true } }));
    await waitFor(() => expect(mockComplete).toHaveBeenCalledOnce());
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });

  it('permet de passer l etape flotte et arrive a la validation', async () => {
    render(
      <MemoryRouter>
        <OnboardingWizard />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Passer' }));
    await waitFor(() => expect(mockSaveStep).toHaveBeenCalledWith(1, {}));
    await screen.findByText('Validation finale');
  });

  it('permet un retour de la validation vers l etape flotte', async () => {
    progress.step = 4;

    render(
      <MemoryRouter>
        <OnboardingWizard />
      </MemoryRouter>,
    );

    await screen.findByText('Validation finale');
    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));
    await screen.findByText('Ajoutez votre premier véhicule');
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
