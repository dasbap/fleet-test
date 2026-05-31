import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DriverTerrainActivationModal } from '@/components/activation/DriverTerrainActivationModal';
import { ROUTE_PATHS } from '@/navigation/routePaths';

const navigateMock = vi.fn();
const useDriverTerrainActivationMock = vi.fn();
const useAuthMock = vi.fn();
const useUpdateDriverProfileMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('@/hooks/useDriverTerrainActivation', () => ({
  useDriverTerrainActivation: () => useDriverTerrainActivationMock(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/hooks/useDriverProfiles', () => ({
  useUpdateDriverProfile: () => useUpdateDriverProfileMock(),
}));

function renderModal(initialPath = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <DriverTerrainActivationModal />
    </MemoryRouter>,
  );
}

describe('DriverTerrainActivationModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({ user: { id: 'user-1' } });
    useUpdateDriverProfileMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    useDriverTerrainActivationMock.mockReturnValue({
      shouldShowModal: true,
      isLoading: false,
      phone: '+237612345678',
      phoneOk: true,
      hasEverShift: false,
      snoozeForOneDay: vi.fn(),
      canSnooze: true,
      snoozeRemaining: 3,
      refetch: vi.fn(),
    });
  });

  it('ne rend rien sur le hub terrain', () => {
    const { container } = renderModal(ROUTE_PATHS.terrain);
    expect(container.firstChild).toBeNull();
  });

  it('navigue vers /terrain au clic sur le CTA sans fermer la modale avant', () => {
    renderModal('/dashboard');

    const cta = screen.getByTestId('driver-terrain-hub-cta');
    expect(cta).toBeEnabled();

    fireEvent.click(cta);

    expect(navigateMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith(ROUTE_PATHS.terrain, { replace: true });
    expect(screen.getByTestId('driver-terrain-hub-cta')).toBeInTheDocument();
  });

  it('affiche le CTA principal avant le bouton Plus tard', () => {
    renderModal('/dashboard');

    const buttons = screen.getAllByRole('button');
    const hubIndex = buttons.findIndex((btn) => btn.textContent?.includes('Ouvrir le hub terrain'));
    const snoozeIndex = buttons.findIndex((btn) => btn.textContent?.includes('Plus tard'));

    expect(hubIndex).toBeGreaterThanOrEqual(0);
    expect(snoozeIndex).toBeGreaterThan(hubIndex);
  });
});
