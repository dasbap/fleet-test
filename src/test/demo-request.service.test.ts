import { describe, expect, it, vi, beforeEach } from "vitest";
import { DemoRequestService } from "@/services/demo-request.service";
import type { DemoRequestRepository } from "@/repositories/demo-request.repository";

describe("DemoRequestService", () => {
  const createMock = vi.fn();
  const repository = { create: createMock } as unknown as DemoRequestRepository;
  const service = new DemoRequestService(repository);

  beforeEach(() => {
    createMock.mockReset();
    createMock.mockResolvedValue(undefined);
  });

  it("normalise et envoie une demande valide", async () => {
    await service.submitRequest({
      name: "  Jean Dupont ",
      company: " TransCam ",
      phone: " +237600000000 ",
      fleetSize: "12",
    });

    expect(createMock).toHaveBeenCalledWith({
      full_name: "Jean Dupont",
      company: "TransCam",
      phone: "+237600000000",
      fleet_size: 12,
    });
  });

  it("rejette un nom vide", async () => {
    await expect(
      service.submitRequest({ name: "  ", phone: "+237600000000" }),
    ).rejects.toThrow("Le nom est requis.");
  });

  it("rejette une taille de flotte invalide", async () => {
    await expect(
      service.submitRequest({ name: "Jean", phone: "+237600000000", fleetSize: "0" }),
    ).rejects.toThrow("La taille de flotte doit être un nombre positif.");
  });
});
