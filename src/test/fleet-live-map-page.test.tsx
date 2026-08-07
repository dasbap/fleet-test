import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import FleetLiveMapPage from "@/pages/FleetLiveMapPage";

vi.mock("@/hooks/useFleetTracking", () => ({
  useVehiclePositionsLive: () => ({ data: [] }),
  useGeofences: () => ({ data: [] }),
  useRecentGeofenceEvents: () => ({ data: [] }),
  useGpsDevices: () => ({ data: [] }),
}));

const fleetLiveMapMock = vi.fn(() => <div data-testid="fleet-live-map" />);

vi.mock("@/components/maps/FleetLiveMap", () => ({
  FleetLiveMap: (props: unknown) => fleetLiveMapMock(props),
}));

describe("FleetLiveMapPage", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    fleetLiveMapMock.mockClear();
  });

  it("affiche la carte sans imposer de token Mapbox", () => {
    render(<FleetLiveMapPage />);

    expect(screen.getByTestId("fleet-live-map")).toBeInTheDocument();
    expect(screen.queryByText(/VITE_MAPBOX_TOKEN/i)).not.toBeInTheDocument();
  });

  it("transmet un fichier Protomaps PMTiles auto-heberge quand il est configure", () => {
    vi.stubEnv("VITE_PROTOMAPS_PM_TILES_URL", "https://cdn.example.com/cameroon.pmtiles");

    render(<FleetLiveMapPage />);

    expect(fleetLiveMapMock).toHaveBeenCalledWith(
      expect.objectContaining({
        protomapsPmtilesUrl: "https://cdn.example.com/cameroon.pmtiles",
      }),
    );
  });
});
