import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  NetworkQualityBadge,
  OfflineBanner,
  OfflineSyncIndicator,
} from "@/components/shared/OfflineBanner";

const useOfflineSyncStatusMock = vi.fn();
const runPendingOfflineSyncMock = vi.fn();
const toastMock = vi.fn();

vi.mock("@/hooks/useOfflineSyncStatus", () => ({
  useOfflineSyncStatus: () => useOfflineSyncStatusMock(),
}));

vi.mock("@/services/syncQueue.service", () => ({
  syncQueue: {
    runPendingOfflineSync: () => runPendingOfflineSyncMock(),
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

describe("OfflineBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("n'affiche rien quand online sans synchro", () => {
    useOfflineSyncStatusMock.mockReturnValue({
      displayStatus: "synced",
      isOnline: true,
      pendingIncidentDraftsCount: 0,
    });

    const { container } = render(<OfflineBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("n'affiche pas un etat de synchronisation avec zero action en attente", () => {
    useOfflineSyncStatusMock.mockReturnValue({
      displayStatus: "synced",
      isOnline: true,
      pendingIncidentDraftsCount: 0,
    });

    const { container } = render(<OfflineBanner />);

    expect(container.firstChild).toBeNull();
    expect(screen.queryByText(/Synchronisation/i)).not.toBeInTheDocument();
  });

  it("affiche le message hors ligne et declenche une relance", async () => {
    useOfflineSyncStatusMock.mockReturnValue({
      displayStatus: "pending",
      isOnline: false,
      pendingIncidentDraftsCount: 2,
    });
    runPendingOfflineSyncMock.mockResolvedValue({
      succeeded: 1,
      failed: 0,
    });

    render(<OfflineBanner />);
    expect(screen.getByRole("alert")).toHaveTextContent("Hors ligne");
    fireEvent.click(screen.getByRole("button", { name: "Sync" }));
    await vi.waitFor(() => {
      expect(runPendingOfflineSyncMock).toHaveBeenCalledTimes(1);
      expect(toastMock).toHaveBeenCalledTimes(1);
    });
  });
});

describe("OfflineSyncIndicator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("masque le badge si aucune action en attente", () => {
    useOfflineSyncStatusMock.mockReturnValue({
      displayStatus: "synced",
      isOnline: true,
      pendingIncidentDraftsCount: 0,
    });
    const { container } = render(<OfflineSyncIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it("affiche le compteur quand file en attente", () => {
    useOfflineSyncStatusMock.mockReturnValue({
      displayStatus: "pending",
      isOnline: false,
      pendingIncidentDraftsCount: 3,
    });
    render(<OfflineSyncIndicator />);
    expect(screen.getByLabelText("3 actions hors ligne en attente")).toBeInTheDocument();
  });
});

describe("NetworkQualityBadge", () => {
  it("affiche un label lisible selon la qualite", () => {
    render(<NetworkQualityBadge type="cellular" effectiveType="3g" />);
    expect(screen.getByText("3G")).toBeInTheDocument();
  });
});
