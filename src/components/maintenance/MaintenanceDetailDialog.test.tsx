import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MaintenanceDetailDialog } from "./MaintenanceDetailDialog";
import * as useMaintenanceModule from "@/hooks/useMaintenance";

const mockRefetch = vi.fn();
const mockMutateAsyncStatus = vi.fn();
const mockMutateAsyncJob = vi.fn();

vi.mock("@/hooks/useMaintenance", () => ({
  useMaintenanceJob: vi.fn(),
  useUpdateJobStatus: vi.fn(() => ({
    mutateAsync: mockMutateAsyncStatus,
    isPending: false,
  })),
  useUpdateMaintenanceJob: vi.fn(() => ({
    mutateAsync: mockMutateAsyncJob,
    isPending: false,
  })),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

vi.mock("./EvidenceUpload", () => ({
  default: ({
    jobId,
    kind,
    existingEvidence,
    disabled,
  }: {
    jobId: string;
    kind: string;
    existingEvidence: unknown[];
    disabled: boolean;
  }) => (
    <div data-testid={`evidence-${kind}`}>
      EvidenceUpload {kind} jobId={jobId} count={existingEvidence.length} disabled={disabled}
    </div>
  ),
}));

const mockJobQueued = {
  id: "job-1",
  vehicle_id: "v-1",
  fleet_id: "f-1",
  created_from_incident_id: null,
  priority: "medium" as const,
  status: "queued" as const,
  created_at: "2024-01-01T10:00:00Z",
  closed_at: null,
  vehicle: {
    id: "v-1",
    registration: "ABC-123",
    brand: "Toyota",
    model: "Yaris",
  },
  incident: null,
  evidence: [],
};

const mockJobReady = {
  ...mockJobQueued,
  status: "ready" as const,
  closed_at: "2024-01-02T14:00:00Z",
};

const mockJobWithPlanning = {
  ...mockJobQueued,
  notes: "Contrôle effectué.",
  planned_at: "2024-01-05T09:00:00Z",
  parts: [{ designation: "Filtre à huile", quantity: 1 }],
};

const mockJobInProgress = {
  ...mockJobQueued,
  status: "in_progress" as const,
  evidence: [],
};

function renderDialog(
  props: { open?: boolean; jobId?: string; onOpenChange?: (open: boolean) => void } = {}
) {
  return render(
    <MaintenanceDetailDialog
      open={props.open ?? true}
      jobId={props.jobId ?? "job-1"}
      onOpenChange={props.onOpenChange ?? vi.fn()}
    />
  );
}

describe("MaintenanceDetailDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsyncStatus.mockResolvedValue(undefined);
    mockMutateAsyncJob.mockResolvedValue(undefined);
    vi.mocked(useMaintenanceModule.useMaintenanceJob).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof useMaintenanceModule.useMaintenanceJob>);
  });

  it(
    "affiche le spinner pendant le chargement",
    () => {
    renderDialog();
    // Titre possible en sr-only (Radix) : présent pour l’accessibilité, pas affiché visuellement.
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
    },
    15000
  );

  it(
    "affiche un message d'erreur et les boutons Réessayer / Fermer en cas d'erreur",
    async () => {
    vi.mocked(useMaintenanceModule.useMaintenanceJob).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Erreur réseau"),
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof useMaintenanceModule.useMaintenanceJob>);

    renderDialog();

    await waitFor(() => {
      expect(screen.getByText(/Erreur réseau|Impossible de charger/)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Réessayer/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Fermer/i }).length).toBeGreaterThan(0);
    },
    15000
  );

  it(
    "appelle refetch au clic sur Réessayer",
    () => {
    vi.mocked(useMaintenanceModule.useMaintenanceJob).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Erreur"),
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof useMaintenanceModule.useMaintenanceJob>);

    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /Réessayer/i }));

    expect(mockRefetch).toHaveBeenCalledTimes(1);
    },
    15000
  );

  it(
    "affiche le titre, la plaque, le statut et la priorité quand le job est chargé",
    async () => {
    vi.mocked(useMaintenanceModule.useMaintenanceJob).mockReturnValue({
      data: mockJobQueued,
      isLoading: false,
      isError: false,
      error: null,
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof useMaintenanceModule.useMaintenanceJob>);

    renderDialog();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Détails de l'intervention/i })).toBeInTheDocument();
    });
    expect(screen.getByText("ABC-123")).toBeInTheDocument();
    expect(screen.getByText("En attente")).toBeInTheDocument();
    expect(screen.getByText("Moyenne")).toBeInTheDocument();
    },
    15000
  );

  it(
    "affiche les boutons Passer en En cours et Passer en Bloquée pour un job en attente",
    async () => {
    vi.mocked(useMaintenanceModule.useMaintenanceJob).mockReturnValue({
      data: mockJobQueued,
      isLoading: false,
      isError: false,
      error: null,
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof useMaintenanceModule.useMaintenanceJob>);

    renderDialog();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Passer en "En cours"/i })).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Passer en "Bloquée"/i })).toBeInTheDocument();
    },
    15000
  );

  it(
    "appelle mutateAsync avec le bon statut au clic sur Passer en En cours",
    async () => {
    vi.mocked(useMaintenanceModule.useMaintenanceJob).mockReturnValue({
      data: mockJobQueued,
      isLoading: false,
      isError: false,
      error: null,
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof useMaintenanceModule.useMaintenanceJob>);

    renderDialog();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Passer en "En cours"/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /Passer en "En cours"/i }));

    await waitFor(() => {
      expect(mockMutateAsyncStatus).toHaveBeenCalledWith({ id: "job-1", status: "in_progress" });
    });
    },
    15000
  );

  it(
    "n'affiche aucun bouton de changement de statut pour un job terminé (ready)",
    async () => {
    vi.mocked(useMaintenanceModule.useMaintenanceJob).mockReturnValue({
      data: mockJobReady,
      isLoading: false,
      isError: false,
      error: null,
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof useMaintenanceModule.useMaintenanceJob>);

    renderDialog();

    await waitFor(() => {
      expect(screen.getByText("ABC-123")).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /Passer en/ })).not.toBeInTheDocument();
    },
    15000
  );

  it(
    "affiche les onglets Avant intervention et Après intervention avec EvidenceUpload",
    async () => {
    vi.mocked(useMaintenanceModule.useMaintenanceJob).mockReturnValue({
      data: mockJobQueued,
      isLoading: false,
      isError: false,
      error: null,
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof useMaintenanceModule.useMaintenanceJob>);

    renderDialog();

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Avant intervention/i })).toBeInTheDocument();
    });
    expect(screen.getByRole("tab", { name: /Après intervention/i })).toBeInTheDocument();
    // Onglet "Avant" actif par défaut : EvidenceUpload before visible
    expect(screen.getByTestId("evidence-before")).toBeInTheDocument();
    expect(screen.getByText(/EvidenceUpload before jobId=job-1 count=0/)).toBeInTheDocument();
    },
    15000
  );

  it(
    "affiche la section Planification et suivi avec date prévue, notes et pièces quand renseignées",
    async () => {
    vi.mocked(useMaintenanceModule.useMaintenanceJob).mockReturnValue({
      data: mockJobWithPlanning,
      isLoading: false,
      isError: false,
      error: null,
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof useMaintenanceModule.useMaintenanceJob>);

    renderDialog();

    await waitFor(() => {
      expect(screen.getByText("Planification et suivi")).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue("Contrôle effectué.")).toBeInTheDocument();
    expect(screen.getByText(/Filtre à huile × 1/)).toBeInTheDocument();
    },
    15000
  );

  it(
    "désactive le bouton Terminée sans photos avant et après",
    async () => {
    vi.mocked(useMaintenanceModule.useMaintenanceJob).mockReturnValue({
      data: mockJobInProgress,
      isLoading: false,
      isError: false,
      error: null,
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof useMaintenanceModule.useMaintenanceJob>);

    renderDialog();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Passer en "Terminée"/i })).toBeDisabled();
    });
    },
    15000
  );
});
