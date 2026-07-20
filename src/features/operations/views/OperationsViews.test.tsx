import type { ReactElement } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { OrganizerOperationsView } from "@/features/operations/views/OrganizerOperationsView";
import { DriverOperationsView } from "@/features/operations/views/DriverOperationsView";
import { MechanicOperationsView } from "@/features/operations/views/MechanicOperationsView";
import { ManagerOperationsView } from "@/features/operations/views/ManagerOperationsView";
import { getDefaultDriverChecklists } from "@/features/operations/mocks/operationsMock";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
    userFleetId: "fleet-1",
    role: "organizer",
  }),
}));

const baseQuery = {
  isPending: false,
  isError: false,
  error: null,
};

vi.mock("@/hooks/useOperations", () => ({
  operationsQueryKeys: {
    all: ["operations"],
    organizer: (id: string) => ["operations", "organizer", id],
    manager: (id: string) => ["operations", "manager", id],
    driver: (id: string) => ["operations", "driver", id],
    mechanic: (id: string) => ["operations", "mechanic", id],
  },
  useOrganizerOperations: () => ({
    ...baseQuery,
    data: {
      missionsToday: [
        {
          id: "m1",
          title: "Mission fixture organisateur",
          vehicleLabel: "Camion A",
          timeWindow: "08:00 – 12:00",
          status: "in_progress",
          href: "/dashboard/closure",
        },
      ],
      vehiclesInService: [
        { id: "v1", label: "Camion A", driver: "Conducteur X", route: "Ligne nord" },
      ],
      operationalIncidents: [],
      assignedTasks: [],
      plannedShiftsToday: [],
    },
  }),
  useManagerOperations: () => ({
    ...baseQuery,
    data: {
      summary: [{ label: "KPI test", value: "3", hint: "hint" }],
      incidents: [
        {
          id: "i1",
          title: "Incident fixture gestionnaire",
          vehicleLabel: "Truck",
          severity: "high" as const,
          impact: "Parc",
          href: "/dashboard/incidents",
        },
      ],
      scheduledMaintenance: [],
    },
  }),
  useDriverOperations: () => {
    const { departureChecklist, arrivalChecklist } = getDefaultDriverChecklists();
    return {
      ...baseQuery,
      data: {
        missionTitle: "Mission fixture conducteur",
        missionRoute: "Itinéraire test",
        missionStatus: "in_progress",
        missionTime: "06:00",
        vehicleLabel: "Véhicule test",
        vehiclePlate: "AA-000-BB",
        vehicleKm: "10 000 km",
        activeShiftId: "shift-fixture-1",
        vehicleId: "vehicle-fixture-1",
        fleetId: "fleet-1",
        departureChecklist,
        arrivalChecklist,
      },
    };
  },
  useMechanicOperations: () => ({
    ...baseQuery,
    data: {
      interventionsToday: [
        {
          id: "int1",
          vehicleLabel: "Atelier fixture",
          plate: "ZZ-111-AA",
          priority: "medium" as const,
          status: "in_progress",
          diagnostic: "Test diagnostic",
          actionsDone: ["Action 1"],
          canClose: false,
          href: "/dashboard/maintenance",
        },
      ],
      summary: { diagnosticsEnCours: 1, actionsRealisees: 1, cloturesPossibles: 0 },
    },
  }),
}));

vi.mock("@/hooks/usePlannedShifts", () => ({
  plannedShiftQueryKeys: {
    all: ["planned-shifts"],
    fleetToday: (id?: string) => ["planned-shifts", "fleet-today", id],
    driverUpcoming: (id?: string) => ["planned-shifts", "driver-upcoming", id],
  },
  usePlannedShiftsForFleetToday: () => ({
    ...baseQuery,
    data: [],
  }),
  useUpcomingPlannedShift: () => ({
    ...baseQuery,
    data: null,
  }),
  useCreatePlannedShift: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  linkPlannedShiftOnStart: vi.fn(),
}));

vi.mock("@/hooks/useAssignments", () => ({
  useFleetDrivers: () => ({ data: [], isPending: false }),
}));

vi.mock("@/hooks/useVehicles", () => ({
  useVehicles: () => ({ data: [], isPending: false }),
}));

vi.mock("@/hooks/useFleetCompliance", () => ({
  usePendingClosures: () => ({ data: [], isPending: false }),
}));

vi.mock("@/hooks/useDriverShifts", () => ({
  useReviewClosure: () => ({ mutate: vi.fn(), isPending: false }),
  useActiveShift: () => ({ data: null, isPending: false }),
}));

vi.mock("@/components/dashboard/TableauValidations", () => ({
  TableauValidations: () => <div data-testid="tableau-validations">Tableau validations</div>,
}));

vi.mock("@/components/terrain/ClotureCreneau", () => ({
  ClotureCreneau: () => <div data-testid="cloture-creneau">Clôture</div>,
}));

vi.mock("@/components/terrain/FicheCreneauActif", () => ({
  FicheCreneauActif: () => <div data-testid="fiche-creneau-actif">Fiche validations</div>,
}));

function wrap(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("Vues Opérations (UI par rôle)", () => {
  it("organisateur : sections missions et circulation visibles", () => {
    wrap(<OrganizerOperationsView />);
    expect(screen.getByText("Clôtures à valider")).toBeInTheDocument();
    expect(screen.getByText("Missions du jour")).toBeInTheDocument();
    expect(screen.getByText("Mission fixture organisateur")).toBeInTheDocument();
    expect(screen.getByText("Véhicules en circulation")).toBeInTheDocument();
    expect(screen.getByText("Conducteur X")).toBeInTheDocument();
  });

  it("conducteur : mission, checklists départ / arrivée et signalement visibles", () => {
    wrap(<DriverOperationsView />);
    expect(screen.getByText("Ma mission du jour")).toBeInTheDocument();
    expect(screen.getByText("Mission fixture conducteur")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Clôture de créneau/i })).toHaveAttribute(
      "href",
      "/dashboard/closure",
    );
    expect(screen.getByTestId("fiche-creneau-actif")).toBeInTheDocument();
    expect(screen.getByText(/Complétez la clôture/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Checklist départ" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Checklist arrivée" })).toBeInTheDocument();
    expect(screen.getByText("Feux, essuie-glaces et signalisation")).toBeInTheDocument();
    expect(screen.getByText("Kilométrage fin de service saisi")).toBeInTheDocument();
    expect(screen.getByText("0/4")).toBeInTheDocument();
    expect(screen.getByText("0/3")).toBeInTheDocument();
    expect(screen.getAllByText("Signaler un problème").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("link", { name: /Accéder aux incidents/i })).toHaveAttribute(
      "href",
      "/dashboard/incidents",
    );
  });

  it("mécanicien : interventions, diagnostics et bandeau synthèse", () => {
    wrap(<MechanicOperationsView />);
    expect(screen.getByText("Interventions du jour")).toBeInTheDocument();
    expect(screen.getAllByText("Atelier fixture").length).toBeGreaterThan(0);
    expect(screen.getByText(/diagnostics en cours/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Diagnostic$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Actions réalisées$/i })).toBeInTheDocument();
  });

  it("gestionnaire : synthèse et incidents parc", () => {
    wrap(<ManagerOperationsView />);
    expect(screen.getByText("Clôtures à valider")).toBeInTheDocument();
    expect(screen.getByText("Vue synthétique des opérations")).toBeInTheDocument();
    expect(screen.getByText(/kpi test/i)).toBeInTheDocument();
    expect(screen.getByText("Incident fixture gestionnaire")).toBeInTheDocument();
  });
});
