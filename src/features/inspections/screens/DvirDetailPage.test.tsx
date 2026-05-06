import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import DvirDetailPage from "@/features/inspections/screens/DvirDetailPage";

vi.mock("@/hooks/useDvir", () => ({
  useDvirById: () => ({
    data: {
      vehicle_registration: "AB-123-CD",
      inspector_name: "Inspecteur Test",
      inspected_by: "user-1",
      inspection_type: "pre_trip",
      overall_status: "ok",
      inspected_at: new Date().toISOString(),
      notes: "Aucun défaut",
    },
    isLoading: false,
  }),
}));

describe("DvirDetailPage", () => {
  it("affiche les informations détaillées d'une inspection", () => {
    render(
      <MemoryRouter initialEntries={["/inspections/dvir-1"]}>
        <Routes>
          <Route path="/inspections/*" element={<DvirDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Détail inspection DVIR")).toBeInTheDocument();
    expect(screen.getByText(/AB-123-CD/)).toBeInTheDocument();
    expect(screen.getByText(/Inspecteur Test/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Modifier" })).toHaveAttribute(
      "href",
      "/inspections/dvir-1/modifier",
    );
  });
});
