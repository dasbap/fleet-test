import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionableDashboard, ActionableDashboardSkeleton } from "@/components/dashboard/ActionableDashboard";
import type { MaintenanceJob } from "@/hooks/useMaintenance";
import type { DashboardAlert, KpiSummary } from "@/types/dashboard";

const useAuthMock = vi.fn();
const listsPropsSpy = vi.fn();
const plannerPropsSpy = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("@/components/dashboard/ActionableDashboardLists", () => ({
  ActionableDashboardLists: (props: Record<string, unknown>) => {
    listsPropsSpy(props);
    const onPlanAlert = props.onPlanAlert as (alert: DashboardAlert) => void;
    const onPlanJob = props.onPlanJob as (job: MaintenanceJob) => void;

    return (
      <div>
        <button type="button" onClick={() => onPlanAlert((props.alerts as DashboardAlert[])[0])}>
          plan-alert
        </button>
        <button type="button" onClick={() => onPlanJob((props.scheduledJobs as MaintenanceJob[])[0])}>
          plan-job
        </button>
      </div>
    );
  },
}));

vi.mock("@/components/maintenance/MaintenancePlannerModal", () => ({
  MaintenancePlannerModal: (props: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    vehicle: { registration: string };
  }) => {
    plannerPropsSpy(props);
    if (!props.open) return null;
    return (
      <div role="dialog">
        <span>{props.vehicle.registration}</span>
        <button type="button" onClick={() => props.onOpenChange(false)}>
          close-planner
        </button>
      </div>
    );
  },
}));

describe("ActionableDashboard", () => {
  const baseKpis: KpiSummary = {
    activeVehicles: 12,
    inMaintenance: 3,
    criticalAlerts: 2,
    overdueServices: 1,
    deltaCritical: 1,
    deltaActive: 2,
  };

  const baseAlerts: DashboardAlert[] = [
    {
      id: "a-1",
      vehicleId: "veh-1",
      plate: "LT-001-AA",
      vehicleName: "Toyota Hilux",
      severity: "critical",
      type: "brakes",
      message: "Freinage critique",
      createdAt: "2026-04-25T10:00:00.000Z",
      resolvedAt: null,
      action: {
        kind: "schedule",
        label: "Planifier",
        payload: {},
      },
    },
  ];

  const baseJobs: MaintenanceJob[] = [
    {
      id: "j-1",
      vehicle_id: "veh-2",
      fleet_id: "fleet-1",
      created_from_incident_id: null,
      priority: "high",
      status: "queued",
      created_at: "2026-04-25T10:00:00.000Z",
      closed_at: null,
      vehicle: {
        id: "veh-2",
        registration: "LT-002-AA",
        brand: "Isuzu",
        model: "D-Max",
      },
    },
  ];

  const onNavigateVehicle = vi.fn();
  const onNavigateAlerts = vi.fn();
  const onNavigateMaintenance = vi.fn();
  const onResolveAlert = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({ userFleetId: "fleet-1" });
  });

  async function renderAndWaitDashboardReady() {
    render(
      <ActionableDashboard
        kpis={baseKpis}
        alerts={baseAlerts}
        scheduledJobs={baseJobs}
        avgKm={0}
        todayRevenueXaf={0}
        totalVehicles={1}
        onNavigateVehicle={onNavigateVehicle}
        onNavigateAlerts={onNavigateAlerts}
        onNavigateMaintenance={onNavigateMaintenance}
        onResolveAlert={onResolveAlert}
      />,
    );

    await screen.findByRole("button", { name: "plan-alert" });
  }

  it("affiche les KPI et les formats monétaires/km", async () => {
    render(
      <ActionableDashboard
        kpis={baseKpis}
        alerts={baseAlerts}
        scheduledJobs={baseJobs}
        avgKm={15234}
        todayRevenueXaf={220000}
        totalVehicles={20}
        onNavigateVehicle={onNavigateVehicle}
        onNavigateAlerts={onNavigateAlerts}
        onNavigateMaintenance={onNavigateMaintenance}
        onResolveAlert={onResolveAlert}
      />,
    );

    expect(screen.getByRole("heading", { name: "Tableau de bord" })).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("20 au total")).toBeInTheDocument();
    expect(screen.getByText(/220.?000/)).toBeInTheDocument();
    expect(screen.getByText(/KM moyen\s*:\s*15.?234 km/)).toBeInTheDocument();
  }, 10_000);

  it("déclenche les CTA KPI", () => {
    render(
      <ActionableDashboard
        kpis={baseKpis}
        alerts={baseAlerts}
        scheduledJobs={baseJobs}
        avgKm={0}
        todayRevenueXaf={0}
        totalVehicles={1}
        onNavigateVehicle={onNavigateVehicle}
        onNavigateAlerts={onNavigateAlerts}
        onNavigateMaintenance={onNavigateMaintenance}
        onResolveAlert={onResolveAlert}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /3 en entretien/i }));
    fireEvent.click(screen.getByRole("button", { name: /Traiter maintenant/i }));
    fireEvent.click(screen.getByRole("button", { name: /Planifier/i }));

    expect(onNavigateMaintenance).toHaveBeenCalledTimes(2);
    expect(onNavigateAlerts).toHaveBeenCalledTimes(1);
  });

  it("ouvre le planificateur depuis les callbacks de listes", async () => {
    await renderAndWaitDashboardReady();

    fireEvent.click(screen.getByRole("button", { name: "plan-alert" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("LT-001-AA")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "close-planner" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "plan-job" }));
    expect(await screen.findByText("LT-002-AA")).toBeInTheDocument();
    expect(plannerPropsSpy).toHaveBeenCalled();
  });

  it("redirige vers maintenance si la flotte est absente", async () => {
    useAuthMock.mockReturnValue({ userFleetId: null });

    render(
      <ActionableDashboard
        kpis={baseKpis}
        alerts={baseAlerts}
        scheduledJobs={baseJobs}
        avgKm={0}
        todayRevenueXaf={0}
        totalVehicles={1}
        onNavigateVehicle={onNavigateVehicle}
        onNavigateAlerts={onNavigateAlerts}
        onNavigateMaintenance={onNavigateMaintenance}
        onResolveAlert={onResolveAlert}
      />,
    );

    await screen.findByRole("button", { name: "plan-alert" });
    fireEvent.click(screen.getByRole("button", { name: "plan-alert" }));
    fireEvent.click(screen.getByRole("button", { name: "plan-job" }));

    expect(onNavigateMaintenance).toHaveBeenCalledTimes(2);
  });
});

describe("ActionableDashboardSkeleton", () => {
  it("affiche le squelette de chargement", () => {
    const { container } = render(<ActionableDashboardSkeleton />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });
});
