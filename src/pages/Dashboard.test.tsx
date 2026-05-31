import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "@/pages/Dashboard";
import { createQueryClientWrapper } from "@/test/utils";
import { useFleetDriverActivationHealth } from "@/hooks/useFleetDriverActivationHealth";
import { useFleetDrivers } from "@/hooks/useAssignments";
import { useUpdateDriverProfile } from "@/hooks/useDriverProfiles";
import type { FleetDriverActivationHealth } from "@/types/fleet-driver-activation-health";
import { useDriverScores } from "@/hooks/useDriverScores";

const useActivationMock = vi.fn();
const useAuthMock = vi.fn();
const useActionableDashboardMock = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("@/hooks/useActivation", () => ({
  useActivation: () => useActivationMock(),
}));

vi.mock("@/hooks/useActionableDashboard", () => ({
  useActionableDashboard: () => useActionableDashboardMock(),
}));

vi.mock("@/hooks/useDriverScores", () => ({
  useDriverScores: vi.fn(),
}));

vi.mock("@/hooks/useFleetDriverActivationHealth", () => ({
  useFleetDriverActivationHealth: vi.fn(),
}));

vi.mock("@/hooks/useAssignments", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/hooks/useAssignments")>();
  return {
    ...mod,
    useFleetDrivers: vi.fn(),
  };
});

vi.mock("@/hooks/useDriverProfiles", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/hooks/useDriverProfiles")>();
  return {
    ...mod,
    useUpdateDriverProfile: vi.fn(),
  };
});

vi.mock("@/components/dashboard/EmptyStateDashboard", () => ({
  EmptyStateDashboard: () => <div>empty-state-dashboard</div>,
}));

vi.mock("@/components/shared/ActivationChecklist", () => ({
  ActivationChecklist: () => <div>activation-checklist</div>,
}));

const usePendingClosuresMock = vi.fn();
vi.mock("@/hooks/useFleetCompliance", () => ({
  usePendingClosures: (...args: unknown[]) => usePendingClosuresMock(...args),
  useExpiringVehicleDocuments: () => ({ data: [] }),
}));

const toastMock = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  toast: (args: unknown) => toastMock(args),
}));

describe("DashboardPage", () => {
  const queryWrapper = createQueryClientWrapper();
  const FLEET_ID = "00000000-0000-0000-0000-0000000000a1";

  const emptyHealth: FleetDriverActivationHealth = {
    total_drivers: 0,
    with_phone_count: 0,
    never_shifted_count: 0,
    pct_with_phone: 0,
    drivers: [],
  };

  const mutateAsyncMock = vi.fn().mockResolvedValue({ full_name: "Conducteur" });

  beforeEach(() => {
    useActivationMock.mockReset();
    toastMock.mockReset();
    usePendingClosuresMock.mockReset();
    usePendingClosuresMock.mockReturnValue({ data: [] });
    mutateAsyncMock.mockReset();
    mutateAsyncMock.mockResolvedValue({ full_name: "Conducteur" });

    useAuthMock.mockReturnValue({
      user: { created_at: "2026-04-10T00:00:00.000Z" },
      userFleetId: null,
      role: null,
    });
    useActionableDashboardMock.mockReturnValue({
      kpis: null,
      alerts: [],
      resolveAlert: vi.fn(),
      scheduledJobs: [],
      avgKm: 0,
      todayRevenueXaf: 0,
      totalVehicles: 0,
      coreLoading: true,
      loading: false,
    });

    vi.mocked(useFleetDriverActivationHealth).mockReturnValue({
      data: emptyHealth,
      isLoading: false,
      isError: false,
      error: null,
      isFetching: false,
      status: "success",
    } as ReturnType<typeof useFleetDriverActivationHealth>);

    vi.mocked(useFleetDrivers).mockReturnValue({
      data: [],
      isLoading: false,
    } as ReturnType<typeof useFleetDrivers>);

    vi.mocked(useUpdateDriverProfile).mockReturnValue({
      mutateAsync: mutateAsyncMock,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateDriverProfile>);

    vi.mocked(useDriverScores).mockReturnValue({
      data: [],
      isLoading: false,
    } as ReturnType<typeof useDriverScores>);
  });

  it("affiche le skeleton pendant le chargement", () => {
    useActivationMock.mockReturnValue({ loading: true, completedCount: 0, steps: [] });

    const { container } = render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
      { wrapper: queryWrapper },
    );

    expect(container.querySelector(".animate-pulse")).not.toBeNull();
  });

  it("affiche l'empty state quand completedCount=0", () => {
    useActivationMock.mockReturnValue({ loading: false, completedCount: 0, steps: [] });

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
      { wrapper: queryWrapper },
    );

    expect(screen.getByText("empty-state-dashboard")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tableau de bord" })).toBeInTheDocument();
  });

  it("affiche la checklist quand activation partielle", () => {
    useActivationMock.mockReturnValue({
      loading: false,
      completedCount: 1,
      steps: [
        {
          id: "first_vehicle",
          label: "Ajouter votre premier v?hicule",
          description: "desc",
          cta: "Ajouter un v?hicule",
          href: "/dashboard/vehicles",
          icon: "??",
          impact: "impact",
          completed: false,
        },
        {
          id: "first_alert",
          label: "Configurer une alerte",
          description: "desc",
          cta: "Configurer une alerte",
          href: "/dashboard/alerts",
          icon: "??",
          impact: "impact",
          completed: false,
        },
      ],
    });

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
      { wrapper: queryWrapper },
    );

    expect(
      screen.getAllByRole("heading", { name: "Tableau de bord" }).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("activation-checklist")).toBeInTheDocument();
  });

  it("charge le widget scores conducteurs avec limit 5", () => {
    useAuthMock.mockReturnValue({
      user: { created_at: "2026-04-10T00:00:00.000Z" },
      userFleetId: FLEET_ID,
      role: "organizer",
    });
    useActivationMock.mockReturnValue({
      loading: false,
      completedCount: 2,
      steps: [
        { id: "a", label: "a", description: "", cta: "", href: "/", icon: "", impact: "", completed: true },
        { id: "b", label: "b", description: "", cta: "", href: "/", icon: "", impact: "", completed: true },
      ],
    });
    vi.mocked(useDriverScores).mockReturnValue({
      data: [
        { id: "s1", driver: { full_name: "Driver A" }, score_total: 87 },
        { id: "s2", driver: { full_name: "Driver B" }, score_total: 74 },
      ],
      isLoading: false,
    } as ReturnType<typeof useDriverScores>);

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
      { wrapper: queryWrapper },
    );

    expect(useDriverScores).toHaveBeenCalledWith(FLEET_ID, { enabled: true, limit: 5 });
    expect(screen.getByText("Scores conducteurs")).toBeInTheDocument();
    expect(screen.getByText(/1\. Driver A/)).toBeInTheDocument();
  });

  describe("bannière téléphones (flotte + rôle backoffice)", () => {
    const healthWithGaps: FleetDriverActivationHealth = {
      total_drivers: 3,
      with_phone_count: 1,
      never_shifted_count: 0,
      pct_with_phone: 33.3,
      drivers: [
        { user_id: "u1", has_phone: true, has_ever_shift: true },
        { user_id: "u-b", has_phone: false, has_ever_shift: true },
        { user_id: "u-c", has_phone: false, has_ever_shift: true },
      ],
    };

    beforeEach(() => {
      useAuthMock.mockReturnValue({
        user: { created_at: "2026-04-10T00:00:00.000Z" },
        userFleetId: FLEET_ID,
        role: "organizer",
      });

      vi.mocked(useFleetDriverActivationHealth).mockReturnValue({
        data: healthWithGaps,
        isLoading: false,
        isError: false,
        error: null,
        isFetching: false,
        status: "success",
      } as ReturnType<typeof useFleetDriverActivationHealth>);

      vi.mocked(useFleetDrivers).mockReturnValue({
        data: [
          {
            user_id: "u-b",
            full_name: "Jean Dupont",
            phone: null,
            role: "driver",
            is_active: true,
          },
          {
            user_id: "u-c",
            full_name: "Marie Martin",
            phone: null,
            role: "driver",
            is_active: true,
          },
        ],
        isLoading: false,
      } as ReturnType<typeof useFleetDrivers>);

      useActivationMock.mockReturnValue({
        loading: false,
        completedCount: 2,
        steps: [
          { id: "a", label: "a", description: "", cta: "", href: "/", icon: "", impact: "", completed: true },
          { id: "b", label: "b", description: "", cta: "", href: "/", icon: "", impact: "", completed: true },
        ],
      });
    });

    it("affiche la bannière avec le bon effectif manquant", () => {
      render(
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>,
        { wrapper: queryWrapper },
      );

      const status = screen.getByRole("status");
      expect(status).toHaveTextContent("2 chauffeurs sans numéro mobile");
      expect(within(status).getByRole("button", { name: /Renseigner les numéros/i })).toBeInTheDocument();
    });

    it("ouvre la modale et permet d’enregistrer un numéro valide", async () => {
      render(
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>,
        { wrapper: queryWrapper },
      );

      fireEvent.click(screen.getByRole("button", { name: /Renseigner les numéros/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      expect(screen.getByRole("heading", { name: "Numéros chauffeurs" })).toBeInTheDocument();
      expect(screen.getByText("Jean Dupont")).toBeInTheDocument();
      expect(screen.getByText("Marie Martin")).toBeInTheDocument();

      const dialog = screen.getByRole("dialog");
      const firstRow = screen.getByText("Jean Dupont").closest("li");
      expect(firstRow).toBeTruthy();
      const firstInput = within(firstRow as HTMLElement).getByPlaceholderText("6XX XXX XXX");
      fireEvent.change(firstInput, { target: { value: "699000111" } });
      fireEvent.click(within(firstRow as HTMLElement).getByRole("button", { name: "Enregistrer" }));

      await waitFor(() => {
        expect(mutateAsyncMock).toHaveBeenCalledWith({
          driverUserId: "u-b",
          updates: { phone: "+237699000111" },
        });
      });

      /* Deux boutons « Fermer » (pied + icône Radix) : on prend celui du pied de modale. */
      const fermerButtons = within(dialog).getAllByRole("button", { name: "Fermer" });
      fireEvent.click(fermerButtons[0]);

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });

      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Numéros enregistrés",
          description: expect.stringContaining("1 numéro"),
        }),
      );
    }, 10_000);
  });

  describe("bannière clôtures à valider", () => {
    beforeEach(() => {
      useActivationMock.mockReturnValue({ loading: false, completedCount: 0, steps: [] });
      usePendingClosuresMock.mockReturnValue({
        data: [{ id: "closure-1" }],
      });
    });

    it("masque la bannière pour un conducteur", () => {
      useAuthMock.mockReturnValue({
        user: { created_at: "2026-04-10T00:00:00.000Z" },
        userFleetId: FLEET_ID,
        role: "driver",
      });

      render(
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>,
        { wrapper: queryWrapper },
      );

      expect(screen.queryByText("Clôtures à valider")).not.toBeInTheDocument();
    });

    it("affiche la bannière pour un gestionnaire", () => {
      useAuthMock.mockReturnValue({
        user: { created_at: "2026-04-10T00:00:00.000Z" },
        userFleetId: FLEET_ID,
        role: "manager",
      });

      render(
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>,
        { wrapper: queryWrapper },
      );

      expect(screen.getByText("Clôtures à valider")).toBeInTheDocument();
    });
  });
});
