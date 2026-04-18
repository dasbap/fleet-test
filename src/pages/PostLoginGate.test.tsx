import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import PostLoginGate from "@/pages/PostLoginGate";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const useAuthFlowMock = vi.fn();

vi.mock("@/hooks/useAuthFlow", () => ({
  useAuthFlow: () => useAuthFlowMock(),
}));

describe("PostLoginGate", () => {
  it("ne navigue pas tant que le flux n'est pas prêt", () => {
    useAuthFlowMock.mockReturnValue({
      isReady: false,
      decision: null,
    });

    render(
      <MemoryRouter>
        <PostLoginGate />
      </MemoryRouter>,
    );

    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("redirige vers decision.path quand prêt", () => {
    useAuthFlowMock.mockReturnValue({
      isReady: true,
      decision: { path: "/dashboard", reason: "default_next" },
    });

    render(
      <MemoryRouter>
        <PostLoginGate />
      </MemoryRouter>,
    );

    expect(navigateMock).toHaveBeenCalledWith("/dashboard", { replace: true });
  });
});

