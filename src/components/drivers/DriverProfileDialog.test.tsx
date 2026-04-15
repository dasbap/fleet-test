import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DriverProfileDialog from '@/components/drivers/DriverProfileDialog';

const mutateAsyncProfileMock = vi.fn().mockResolvedValue(undefined);
const mutateAsyncLicenseMock = vi.fn().mockResolvedValue(undefined);
const mutateIncidentStatusMock = vi.fn();
const mutateScoreMock = vi.fn();

vi.mock('@/hooks/useDriverProfiles', () => ({
  useDriverProfile: () => ({
    data: {
      full_name: 'Conducteur Test',
      phone: '+237600000000',
      employee_code: 'DRV-001',
      hire_date: '2026-01-10',
      contract_type: 'cdi',
      employment_status: 'active',
      emergency_contact_name: 'Urgence',
      emergency_contact_phone: '+237611111111',
      rh_notes: 'RAS',
    },
  }),
  useDriverLicenses: () => ({ data: [] }),
  useUpdateDriverProfile: () => ({ mutateAsync: mutateAsyncProfileMock, isPending: false }),
  useCreateDriverLicense: () => ({ mutateAsync: mutateAsyncLicenseMock, isPending: false }),
}));

vi.mock('@/hooks/useDriverScores', () => ({
  useDriverScores: () => ({ data: [] }),
  useDriverScoreSnapshots: () => ({ data: [] }),
  useCalculateDriverScore: () => ({ mutate: mutateScoreMock, isPending: false }),
}));

vi.mock('@/hooks/useIncidents', () => ({
  useIncidents: () => ({
    data: [
      {
        id: 'incident-1',
        driver_user_id: 'driver-1',
        description: 'Accrochage mineur',
        severity: 'medium',
        status: 'open',
      },
    ],
  }),
  useUpdateIncidentStatus: () => ({ mutate: mutateIncidentStatusMock, isPending: false }),
}));

function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <DriverProfileDialog
        open
        onOpenChange={() => undefined}
        fleetId="fleet-1"
        driverId="driver-1"
        driverName="Conducteur Test"
      />
    </QueryClientProvider>,
  );
}

describe('DriverProfileDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('affiche des selects stricts pour contrat/statut et permet la mise à jour incident', () => {
    renderDialog();

    expect(screen.getByLabelText('Type de contrat')).toBeInTheDocument();
    expect(screen.getByLabelText('Statut emploi')).toBeInTheDocument();
    expect(screen.getByText('Incidents récents')).toBeInTheDocument();

    const incidentStatusTrigger = screen.getByLabelText('Statut incident incident-1');
    fireEvent.click(incidentStatusTrigger);
    fireEvent.click(screen.getByText('Investigating'));

    fireEvent.click(screen.getByRole('button', { name: 'Mettre à jour' }));

    expect(mutateIncidentStatusMock).toHaveBeenCalledWith({
      incidentId: 'incident-1',
      status: 'investigating',
    });
  });
});
