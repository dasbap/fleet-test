import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import {
  ClosureBanner,
  ExpiringDocumentsBanner,
} from "@/components/alerts/ClosureBanner";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import {
  makeExpiringDocument,
  makePendingClosure,
} from "@/test/fixtures/fleetCompliance.fixtures";

const usePendingClosuresMock = vi.fn();
const useExpiringVehicleDocumentsMock = vi.fn();

vi.mock("@/hooks/useFleetCompliance", () => ({
  usePendingClosures: (...args: unknown[]) => usePendingClosuresMock(...args),
  useExpiringVehicleDocuments: (...args: unknown[]) =>
    useExpiringVehicleDocumentsMock(...args),
}));

function renderWithRouter(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("ClosureBanner", () => {
  beforeEach(() => {
    usePendingClosuresMock.mockReset();
    useExpiringVehicleDocumentsMock.mockReset();
    usePendingClosuresMock.mockReturnValue({ data: [] });
    useExpiringVehicleDocumentsMock.mockReturnValue({ data: [] });
  });

  it("retourne null si fleetId est absent", () => {
    const { container } = renderWithRouter(<ClosureBanner fleetId={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("retourne null quand aucune clôture n'est en attente", () => {
    usePendingClosuresMock.mockReturnValue({ data: [] });
    const { container } = renderWithRouter(<ClosureBanner fleetId="fleet-1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("affiche le compteur et le CTA quand des clôtures sont en attente", () => {
    usePendingClosuresMock.mockReturnValue({
      data: [makePendingClosure(), makePendingClosure({ id: "closure-2" })],
    });

    renderWithRouter(<ClosureBanner fleetId="fleet-1" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Clôtures à valider");
    expect(screen.getByText("2 clôtures de créneau attendent une validation.")).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: "Traiter les clôtures" });
    expect(cta).toHaveAttribute("href", ROUTE_PATHS.dashboardOperationsPendingClosures);
  });

  it("gère la pluralisation pour une clôture unique", () => {
    usePendingClosuresMock.mockReturnValue({ data: [makePendingClosure()] });

    renderWithRouter(<ClosureBanner fleetId="fleet-1" />);

    expect(screen.getByText("1 clôture de créneau attend une validation.")).toBeInTheDocument();
  });

  it("applique le rendu compact", () => {
    usePendingClosuresMock.mockReturnValue({ data: [makePendingClosure()] });

    renderWithRouter(<ClosureBanner fleetId="fleet-1" compact />);

    expect(screen.getByRole("alert")).toHaveClass("p-3");
    expect(screen.getByRole("link", { name: "Traiter les clôtures" })).toBeInTheDocument();
  });

  it("reste résilient avec des données partielles", () => {
    usePendingClosuresMock.mockReturnValue({
      data: [makePendingClosure({ vehicleRegistration: null })],
    });

    renderWithRouter(<ClosureBanner fleetId="fleet-1" />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("1 clôture de créneau attend une validation.")).toBeInTheDocument();
  });
});

describe("ExpiringDocumentsBanner", () => {
  beforeEach(() => {
    usePendingClosuresMock.mockReset();
    useExpiringVehicleDocumentsMock.mockReset();
    usePendingClosuresMock.mockReturnValue({ data: [] });
    useExpiringVehicleDocumentsMock.mockReturnValue({ data: [] });
  });

  it("retourne null si fleetId est absent", () => {
    const { container } = renderWithRouter(<ExpiringDocumentsBanner fleetId={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("retourne null quand aucun document n'expire", () => {
    useExpiringVehicleDocumentsMock.mockReturnValue({ data: [] });
    const { container } = renderWithRouter(
      <ExpiringDocumentsBanner fleetId="fleet-1" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("affiche le compteur et le CTA quand des documents expirent", () => {
    useExpiringVehicleDocumentsMock.mockReturnValue({
      data: [
        makeExpiringDocument(),
        makeExpiringDocument({ id: "doc-2", vehicle_id: "vehicle-2" }),
      ],
    });

    renderWithRouter(<ExpiringDocumentsBanner fleetId="fleet-1" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Documents à échéance proche");
    expect(screen.getByText("2 documents expirent sous 30 jours.")).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: "Voir les véhicules concernés" });
    expect(cta).toHaveAttribute("href", ROUTE_PATHS.dashboardVehicles);
  });

  it("gère la pluralisation pour un document unique", () => {
    useExpiringVehicleDocumentsMock.mockReturnValue({
      data: [makeExpiringDocument()],
    });

    renderWithRouter(<ExpiringDocumentsBanner fleetId="fleet-1" />);

    expect(screen.getByText("1 document expire sous 30 jours.")).toBeInTheDocument();
  });

  it("applique le rendu compact", () => {
    useExpiringVehicleDocumentsMock.mockReturnValue({
      data: [makeExpiringDocument()],
    });

    renderWithRouter(<ExpiringDocumentsBanner fleetId="fleet-1" compact />);

    expect(screen.getByRole("alert")).toHaveClass("p-3");
    expect(screen.getByRole("link", { name: "Voir les véhicules concernés" })).toBeInTheDocument();
  });

  it("reste résilient avec des données incomplètes", () => {
    useExpiringVehicleDocumentsMock.mockReturnValue({
      data: [makeExpiringDocument({ doc_type: "" })],
    });

    renderWithRouter(<ExpiringDocumentsBanner fleetId="fleet-1" />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("1 document expire sous 30 jours.")).toBeInTheDocument();
  });
});
