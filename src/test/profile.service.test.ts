import { describe, expect, it, vi, beforeEach } from "vitest";
import { ProfileService } from "@/services/profile.service";
import type { ProfileRepository } from "@/repositories/profile.repository";

describe("ProfileService.updateProfileFullName", () => {
  const updateAuthFullName = vi.fn();
  const updateFullName = vi.fn();
  const repository = {
    updateAuthFullName,
    updateFullName,
  } as unknown as ProfileRepository;
  const service = new ProfileService(repository);

  beforeEach(() => {
    updateAuthFullName.mockReset();
    updateFullName.mockReset();
    updateAuthFullName.mockResolvedValue(undefined);
    updateFullName.mockResolvedValue(undefined);
  });

  it("met à jour auth et table profils", async () => {
    await service.updateProfileFullName("user-1", "  Jean Dupont  ");

    expect(updateAuthFullName).toHaveBeenCalledWith("Jean Dupont");
    expect(updateFullName).toHaveBeenCalledWith("user-1", "Jean Dupont");
  });

  it("rejette un nom trop court", async () => {
    await expect(service.updateProfileFullName("user-1", "A")).rejects.toThrow(
      "Le nom doit contenir au moins 2 caractères",
    );
  });
});
