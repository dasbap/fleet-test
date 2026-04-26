import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionableDashboardLists } from "@/components/dashboard/ActionableDashboardLists";
import type { MaintenanceJob } from "@/hooks/useMaintenance";
import type { DashboardAlert } from "@/types/dashboard";

const toastMock = vi.fn();

vi.mock("@/hooks/use-toast", () => ({
  toast: (args: unknown) => toastMock(args),
}));

describe("ActionableDashboardLists", () => {
  const onResolveAlert = vi.fn().mockResolvedValue(undefined);
  const onNavigateAlerts = vi.fn();
  const onNavigateMaintenance = vi.fn();
  const onNavigateVehicle = vi.fn();
  const onPlanAlert = vi.fn();
  const onPlanJob = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("affiche les états vides alertes et entretiens", () => {
    render(
      <ActionableDashboardLists
        alerts={[]}
        scheduledJobs={[]}
        onResolveAlert={onResolveAlert}
        onNavigateAlerts={onNavigateAlerts}
        onNavigateMaintenance={onNavigateMaintenance}
        onNavigateVehicle={onNavigateVehicle}
        onPlanAlert={onPlanAlert}
        onPlanJob={onPlanJob}
      />,
    );

    expect(screen.getByText("Aucune alerte active")).toBeInTheDocument();
    expect(screen.getByText("Aucun entretien planifié")).toBeInTheDocument();
  });

  it("gère les actions de navigation/planification/résolution sur alerte", async () => {
    const alerts: DashboardAlert[] = [
      {
        id: "a-1",
        vehicleId: "veh-1",
        plate: "LT-101-AA",
        vehicleName: "Toyota Hilux",
        severity: "critical",
        type: "brakes",
        message: "Freins à vérifier",
        createdAt: "2026-04-25T08:00:00.000Z",
        resolvedAt: null,
        action: {
          kind: "schedule",
          label: "Planifier",
          payload: {},
        },
      },
      {
        id: "a-2",
        vehicleId: "veh-2",
        plate: "LT-102-AA",
        vehicleName: "Isuzu D-Max",
        severity: "warning",
        type: "oil",
        message: "Vidange bientôt due",
        createdAt: "2026-04-25T09:00:00.000Z",
        resolvedAt: null,
        action: {
          kind: "plan",
          label: "Planifier",
          payload: {},
        },
      },
      {
        id: "a-3",
        vehicleId: "veh-3",
        plate: "LT-103-AA",
        vehicleName: "Nissan Navara",
        severity: "info",
        type: "custom",
        message: "Rappel information",
        createdAt: "2026-04-25T10:00:00.000Z",
        resolvedAt: null,
        action: {
          kind: "plan",
          label: "Planifier",
          payload: {},
        },
      },
      {
        id: "a-4",
        vehicleId: "veh-4",
        plate: "LT-104-AA",
        vehicleName: "Ford Ranger",
        severity: "warning",
        type: "ct",
        message: "Contrôle technique proche",
        createdAt: "2026-04-25T10:30:00.000Z",
        resolvedAt: null,
        action: {
          kind: "book",
          label: "Réserver",
          payload: {},
        },
      },
      {
        id: "a-5",
        vehicleId: "veh-5",
        plate: "LT-105-AA",
        vehicleName: "Mitsubishi L200",
        severity: "critical",
        type: "tires",
        message: "Pneus usés",
        createdAt: "2026-04-25T10:45:00.000Z",
        resolvedAt: null,
        action: {
          kind: "order",
          label: "Commander",
          payload: {},
        },
      },
      {
        id: "a-6",
        vehicleId: "veh-6",
        plate: "LT-106-AA",
        vehicleName: "Mazda BT-50",
        severity: "warning",
        type: "revision",
        message: "Révision périodique",
        createdAt: "2026-04-25T11:00:00.000Z",
        resolvedAt: null,
        action: {
          kind: "plan",
          label: "Planifier",
          payload: {},
        },
      },
    ];

    render(
      <ActionableDashboardLists
        alerts={alerts}
        scheduledJobs={[]}
        onResolveAlert={onResolveAlert}
        onNavigateAlerts={onNavigateAlerts}
        onNavigateMaintenance={onNavigateMaintenance}
        onNavigateVehicle={onNavigateVehicle}
        onPlanAlert={onPlanAlert}
        onPlanJob={onPlanJob}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Voir toutes (6)" }));
    expect(onNavigateAlerts).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /LT-101-AA/i }));
    expect(onNavigateVehicle).toHaveBeenCalledWith("veh-1");

    fireEvent.click(screen.getAllByRole("button", { name: "Planifier" })[0]);
    expect(onPlanAlert).toHaveBeenCalledWith(expect.objectContaining({ id: "a-1" }));

    const resolveButtons = screen.getAllByRole("button", { name: "Résoudre" });
    fireEvent.click(resolveButtons[0]);
    await waitFor(() => {
      expect(onResolveAlert).toHaveBeenCalledWith("a-1", alerts[0].action);
    });
  }, 10000);

  it("n'affiche pas le bouton planifier pour les alertes info", () => {
    render(
      <ActionableDashboardLists
        alerts={[
          {
            id: "a-info",
            vehicleId: "veh-i",
            plate: "LT-200-AA",
            vehicleName: "Info Car",
            severity: "info",
            type: "custom",
            message: "Information simple",
            createdAt: "2026-04-25T11:00:00.000Z",
            resolvedAt: null,
            action: { kind: "plan", label: "Planifier", payload: {} },
          },
        ]}
        scheduledJobs={[]}
        onResolveAlert={onResolveAlert}
        onNavigateAlerts={onNavigateAlerts}
        onNavigateMaintenance={onNavigateMaintenance}
        onNavigateVehicle={onNavigateVehicle}
        onPlanAlert={onPlanAlert}
        onPlanJob={onPlanJob}
      />,
    );

    expect(screen.queryByRole("button", { name: "Planifier" })).not.toBeInTheDocument();
  });

  it("affiche les tags d'échéance maintenance et callbacks", () => {
    const now = Date.now();
    const plannedOverdue = new Date(now - 2 * 86_400_000).toISOString();
    const plannedUpcoming = new Date(now + 3 * 86_400_000).toISOString();

    const jobs: MaintenanceJob[] = [
      {
        id: "j-overdue",
        vehicle_id: "veh-1",
        fleet_id: "fleet-1",
        created_from_incident_id: null,
        priority: "critical",
        status: "queued",
        created_at: "2026-04-20T12:00:00.000Z",
        closed_at: null,
        planned_at: plannedOverdue,
        vehicle: { id: "veh-1", registration: "LT-300-AA", brand: "Toyota", model: "Hilux" },
      },
      {
        id: "j-upcoming",
        vehicle_id: "veh-2",
        fleet_id: "fleet-1",
        created_from_incident_id: null,
        priority: "high",
        status: "queued",
        created_at: "2026-04-20T12:00:00.000Z",
        closed_at: null,
        planned_at: plannedUpcoming,
        vehicle: { id: "veh-2", registration: "LT-301-AA", brand: "Isuzu", model: "D-Max" },
      },
      {
        id: "j-unplanned",
        vehicle_id: "veh-3",
        fleet_id: "fleet-1",
        created_from_incident_id: null,
        priority: "medium",
        status: "queued",
        created_at: "2026-04-20T12:00:00.000Z",
        closed_at: null,
        planned_at: null,
        vehicle: { id: "veh-3", registration: "LT-302-AA", brand: "Nissan", model: "Navara" },
      },
    ];

    render(
      <ActionableDashboardLists
        alerts={[]}
        scheduledJobs={jobs}
        onResolveAlert={onResolveAlert}
        onNavigateAlerts={onNavigateAlerts}
        onNavigateMaintenance={onNavigateMaintenance}
        onNavigateVehicle={onNavigateVehicle}
        onPlanAlert={onPlanAlert}
        onPlanJob={onPlanJob}
      />,
    );

    expect(screen.getByText("J+2")).toBeInTheDocument();
    expect(screen.getByText("J−3")).toBeInTheDocument();
    expect(screen.getByText("À planifier")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /LT-300-AA/i }));
    expect(onNavigateVehicle).toHaveBeenCalledWith("veh-1");

    fireEvent.click(screen.getAllByRole("button", { name: "Planifier →" })[0]);
    expect(onPlanJob).toHaveBeenCalledWith(expect.objectContaining({ id: "j-overdue" }));
  });

  it("affiche un toast d'erreur si la résolution échoue", async () => {
    const failingResolve = vi.fn().mockRejectedValue(new Error("down"));
    const alert: DashboardAlert = {
      id: "a-fail",
      vehicleId: "veh-f",
      plate: "LT-900-AA",
      vehicleName: "Truck Fail",
      severity: "critical",
      type: "brakes",
      message: "Erreur",
      createdAt: "2026-04-25T08:00:00.000Z",
      resolvedAt: null,
      action: { kind: "schedule", label: "Planifier", payload: {} },
    };

    render(
      <ActionableDashboardLists
        alerts={[alert]}
        scheduledJobs={[]}
        onResolveAlert={failingResolve}
        onNavigateAlerts={onNavigateAlerts}
        onNavigateMaintenance={onNavigateMaintenance}
        onNavigateVehicle={onNavigateVehicle}
        onPlanAlert={onPlanAlert}
        onPlanJob={onPlanJob}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Résoudre" }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Action indisponible",
          variant: "destructive",
        }),
      );
    });
  });
});
