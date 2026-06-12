import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import IncidentsTable from "./IncidentsTable";
import type { Incident } from "@/hooks/useIncidents";

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    canCreateMaintenanceFromIncident: true,
  }),
}));

vi.mock("@/hooks/useIncidents", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useIncidents")>();
  return {
    ...actual,
    useCreateMaintenanceFromIncident: () => ({
      mutateAsync: vi.fn(),
      isPending: false,
    }),
  };
});

vi.mock("@/components/incidents/IncidentValidationDialog", () => ({
  default: ({ open, incident }: { open: boolean; incident: Incident }) =>
    open ? <div data-testid="incident-details">{incident.description}</div> : null,
}));

vi.mock("@/components/storage/SignedStorageLink", () => ({
  SignedStorageLink: () => null,
}));

const sampleIncident: Incident = {
  id: "inc-1",
  vehicle_id: "veh-1",
  driver_user_id: "user-1",
  severity: "medium",
  description: "Crevaison pneu avant droit",
  incident_category: null,
  evidence_path: null,
  latitude: null,
  longitude: null,
  status: "open",
  resolved_at: null,
  resolved_by: null,
  created_at: "2026-06-12T20:00:00.000Z",
  vehicle: {
    id: "veh-1",
    registration: "CE-071-OL",
    brand: "Toyota",
    model: "Verso",
    fleet_id: "fleet-1",
  },
  driver: {
    user_id: "user-1",
    full_name: "Sébastien Ouene",
  },
};

describe("IncidentsTable", () => {
  it("ouvre le dialogue détails en cliquant la description", () => {
    render(
      <IncidentsTable incidents={[sampleIncident]} isLoading={false} onRefresh={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /crevaison pneu avant droit/i }));

    expect(screen.getByTestId("incident-details")).toBeInTheDocument();
  });
});
