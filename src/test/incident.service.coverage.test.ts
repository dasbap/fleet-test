import { beforeEach, describe, expect, it, vi } from "vitest";
import { IncidentService } from "@/services/incident.service";

const makeRepository = () => ({
  findAll: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
});

const makeEvidenceRepository = () => ({
  uploadFromDataUrl: vi.fn(),
});

const validIncident = (overrides: Record<string, unknown> = {}) => ({
  vehicle_id: "vehicle-1",
  driver_user_id: "driver-1",
  description: "Description suffisamment longue de l'incident",
  severity: "high",
  incident_category: "breakdown",
  evidence_path: null,
  latitude: 14.7167,
  longitude: -17.4677,
  ...overrides,
});

describe("IncidentService", () => {
  let repository: ReturnType<typeof makeRepository>;
  let evidenceRepository: ReturnType<typeof makeEvidenceRepository>;

  beforeEach(() => {
    repository = makeRepository();
    evidenceRepository = makeEvidenceRepository();
  });

  it("refuse une preuve sans flotte", async () => {
    const service = new IncidentService(repository as never, evidenceRepository as never);
    await expect(
      service.declareIncidentWithOptionalEvidence({ fleetId: " ", incident: validIncident() as never }),
    ).rejects.toThrow("L'identifiant de la flotte est requis pour enregistrer la preuve");
  });

  it("refuse une catégorie invalide avant upload", async () => {
    const service = new IncidentService(repository as never, evidenceRepository as never);
    await expect(
      service.declareIncidentWithOptionalEvidence({
        fleetId: "fleet-1",
        incident: validIncident({ incident_category: "invalid" }) as never,
      }),
    ).rejects.toThrow("Catégorie d'incident invalide");
    expect(evidenceRepository.uploadFromDataUrl).not.toHaveBeenCalled();
  });

  it("refuse l'upload si le repository de preuve est absent", async () => {
    const service = new IncidentService(repository as never);
    await expect(
      service.declareIncidentWithOptionalEvidence({
        fleetId: "fleet-1",
        incident: validIncident() as never,
        evidenceDataUrl: "data:image/jpeg;base64,AAAA",
      }),
    ).rejects.toThrow("Le téléversement de photo est momentanément indisponible.");
  });

  it("upload la preuve puis crée l'incident", async () => {
    evidenceRepository.uploadFromDataUrl.mockResolvedValue("fleet-1/vehicle-1/evidence.jpg");
    repository.create.mockImplementation(async (row) => ({ id: "incident-1", ...row }));
    const service = new IncidentService(repository as never, evidenceRepository as never);

    const result = await service.declareIncidentWithOptionalEvidence({
      fleetId: "fleet-1",
      incident: validIncident({ evidence_path: "old.jpg" }) as never,
      evidenceDataUrl: "data:image/jpeg;base64,AAAA",
    });

    expect(evidenceRepository.uploadFromDataUrl).toHaveBeenCalledWith(
      "fleet-1",
      "vehicle-1",
      "data:image/jpeg;base64,AAAA",
    );
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ evidence_path: "fleet-1/vehicle-1/evidence.jpg" }),
    );
    expect(result).toMatchObject({ id: "incident-1" });
  });

  it.each([undefined, null, "", "   "])("n'upload pas une preuve vide %s", async (evidenceDataUrl) => {
    repository.create.mockImplementation(async (row) => ({ id: "incident-1", ...row }));
    const service = new IncidentService(repository as never, evidenceRepository as never);
    await service.declareIncidentWithOptionalEvidence({
      fleetId: "fleet-1",
      incident: validIncident({ evidence_path: "existing.jpg" }) as never,
      evidenceDataUrl,
    });
    expect(evidenceRepository.uploadFromDataUrl).not.toHaveBeenCalled();
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ evidence_path: "existing.jpg" }));
  });

  it("liste les incidents sans filtre de flotte", async () => {
    repository.findAll.mockResolvedValue([{ id: "incident-1" }]);
    const service = new IncidentService(repository as never);
    await expect(service.getIncidents()).resolves.toEqual([{ id: "incident-1" }]);
    expect(repository.findAll).toHaveBeenCalledWith({});
  });

  it("liste les incidents avec filtre de flotte", async () => {
    repository.findAll.mockResolvedValue([]);
    const service = new IncidentService(repository as never);
    await service.getIncidents("fleet-1");
    expect(repository.findAll).toHaveBeenCalledWith({ fleet_id: "fleet-1" });
  });

  it("transmet les filtres complets", async () => {
    repository.findAll.mockResolvedValue([]);
    const service = new IncidentService(repository as never);
    const filters = { fleet_id: "fleet-1", severity: "critical" };
    await service.getAllIncidents(filters as never);
    expect(repository.findAll).toHaveBeenCalledWith(filters);
  });

  it("autorise l'absence de filtres complets", async () => {
    repository.findAll.mockResolvedValue([]);
    const service = new IncidentService(repository as never);
    await service.getAllIncidents();
    expect(repository.findAll).toHaveBeenCalledWith(undefined);
  });

  it("refuse la lecture par id vide", async () => {
    const service = new IncidentService(repository as never);
    await expect(service.getIncidentById("")).rejects.toThrow("L'ID de l'incident est requis");
  });

  it("délègue la lecture par id", async () => {
    repository.findById.mockResolvedValue({ id: "incident-1" });
    const service = new IncidentService(repository as never);
    await expect(service.getIncidentById("incident-1")).resolves.toEqual({ id: "incident-1" });
  });

  it("normalise une création et garde la sévérité explicite", async () => {
    repository.create.mockImplementation(async (row) => ({ id: "incident-1", ...row }));
    const service = new IncidentService(repository as never);
    const result = await service.createIncident(validIncident({ description: "  Une description valide et espacée  " }) as never);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "Une description valide et espacée",
        severity: "high",
        incident_category: "breakdown",
      }),
    );
    expect(result).toMatchObject({ id: "incident-1" });
  });

  it("applique les valeurs par défaut de création", async () => {
    repository.create.mockImplementation(async (row) => ({ id: "incident-1", ...row }));
    const service = new IncidentService(repository as never);
    await service.createIncident(
      validIncident({ severity: undefined, incident_category: undefined, evidence_path: undefined, latitude: undefined, longitude: undefined }) as never,
    );
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ severity: "medium", incident_category: null }),
    );
  });

  it("accepte une catégorie nulle ou vide via validation interne", async () => {
    repository.create.mockImplementation(async (row) => ({ id: "incident-1", ...row }));
    const service = new IncidentService(repository as never);
    await expect(service.createIncident(validIncident({ incident_category: null }) as never)).resolves.toBeTruthy();
  });

  it("refuse une création invalide par le schéma", async () => {
    const service = new IncidentService(repository as never);
    await expect(service.createIncident(validIncident({ description: "court" }) as never)).rejects.toThrow();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("refuse des coordonnées partielles", async () => {
    const service = new IncidentService(repository as never);
    await expect(
      service.createIncident(validIncident({ latitude: 14.7, longitude: null }) as never),
    ).rejects.toThrow();
  });

  it("refuse une mise à jour sans id", async () => {
    const service = new IncidentService(repository as never);
    await expect(service.updateIncident("", {})).rejects.toThrow("L'ID de l'incident est requis");
  });

  it("trim la description lors d'une mise à jour", async () => {
    repository.update.mockResolvedValue({ id: "incident-1" });
    const service = new IncidentService(repository as never);
    await service.updateIncident("incident-1", { description: "  nouveau texte  ", severity: "low" } as never);
    expect(repository.update).toHaveBeenCalledWith("incident-1", { description: "nouveau texte", severity: "low" });
  });

  it("conserve une description vide sans transformation", async () => {
    repository.update.mockResolvedValue({ id: "incident-1" });
    const service = new IncidentService(repository as never);
    await service.updateIncident("incident-1", { description: "" } as never);
    expect(repository.update).toHaveBeenCalledWith("incident-1", { description: "" });
  });

  it("refuse une suppression sans id", async () => {
    const service = new IncidentService(repository as never);
    await expect(service.deleteIncident("")).rejects.toThrow("L'ID de l'incident est requis");
  });

  it("refuse la suppression d'un incident absent", async () => {
    repository.findById.mockResolvedValue(null);
    const service = new IncidentService(repository as never);
    await expect(service.deleteIncident("incident-1")).rejects.toThrow("Incident introuvable");
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it("supprime un incident existant", async () => {
    repository.findById.mockResolvedValue({ id: "incident-1" });
    repository.delete.mockResolvedValue(undefined);
    const service = new IncidentService(repository as never);
    await expect(service.deleteIncident("incident-1")).resolves.toBeUndefined();
    expect(repository.delete).toHaveBeenCalledWith("incident-1");
  });
});
