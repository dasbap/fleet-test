import { render, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWaitForProfileReady } from "@/hooks/useWaitForProfileReady";
import type { AuthUser } from "@/types/auth";

const { mockWaitUntilProfileReady } = vi.hoisted(() => ({
  mockWaitUntilProfileReady: vi.fn(),
}));

vi.mock("@/lib/authMode", () => ({
  isMockAuthEnabled: () => false,
}));

vi.mock("@/services/profile.service", () => ({
  ProfileService: vi.fn().mockImplementation(() => ({
    waitUntilProfileReady: (...args: unknown[]) => mockWaitUntilProfileReady(...args),
  })),
}));

vi.mock("@/repositories/profile.repository", () => ({
  ProfileRepository: vi.fn(),
}));

const user = { id: "user-1" } as AuthUser;

describe("useWaitForProfileReady", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWaitUntilProfileReady.mockResolvedValue("ready");
  });

  it("ne relance pas l'attente du profil apres une resolution prete", async () => {
    const first = renderHook(() => useWaitForProfileReady(user));

    await waitFor(() => {
      expect(first.result.current.status).toBe("ready");
    });
    first.unmount();

    const renders: string[] = [];
    function Probe() {
      renders.push(useWaitForProfileReady(user).status);
      return null;
    }
    render(<Probe />);

    expect(renders[0]).toBe("ready");
  });
});
