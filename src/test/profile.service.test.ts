import { describe, expect, it, vi, beforeEach } from "vitest";
import { ProfileService } from "@/services/profile.service";
import type { ProfileRepository } from "@/repositories/profile.repository";

describe("ProfileService", () => {
  describe("updateProfileFullName", () => {
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

  describe("waitUntilProfileReady", () => {
    it("retourne ready dès que profil_est_pret répond true", async () => {
      const isProfileReadyRpc = vi.fn().mockResolvedValue(true);
      const repository = { isProfileReadyRpc } as unknown as ProfileRepository;
      const service = new ProfileService(repository);

      await expect(service.waitUntilProfileReady("user-1")).resolves.toBe("ready");
      expect(isProfileReadyRpc).toHaveBeenCalled();
    });

    it("tente assurer_profil_utilisateur après timeout puis retourne timeout", async () => {
      const isProfileReadyRpc = vi.fn().mockResolvedValue(false);
      const findByUserId = vi.fn().mockResolvedValue(null);
      const ensureProfileRpc = vi.fn().mockResolvedValue({ success: true, action: "created" });
      const repository = {
        isProfileReadyRpc,
        findByUserId,
        ensureProfileRpc,
      } as unknown as ProfileRepository;
      const service = new ProfileService(repository);

      await expect(
        service.waitUntilProfileReady("user-1", { timeout: 0, interval: 0 }),
      ).resolves.toBe("timeout");
      expect(ensureProfileRpc).toHaveBeenCalled();
    });
  });
});
