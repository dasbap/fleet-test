import { describe, expect, it, vi } from "vitest";
import { MaintenanceEvidenceService } from "@/services/maintenance-evidence.service";
import type { MaintenanceEvidenceRepository } from "@/repositories/maintenance-evidence.repository";

describe("MaintenanceEvidenceService.uploadEvidence", () => {
  it("utilise le chemin standard maintenance/{job_id}/avant|apres/photo_N.ext", async () => {
    const uploadFile = vi.fn().mockResolvedValue(undefined);
    const insertEvidence = vi.fn().mockResolvedValue({
      id: "ev-1",
      job_id: "job-1",
      kind: "before",
      file_path: "maintenance/job-1/avant/photo_1.jpg",
      created_by: "user-1",
      created_at: "2026-06-24T00:00:00.000Z",
    });
    const countEvidenceByKind = vi.fn().mockResolvedValue(0);
    const repository = {
      uploadFile,
      insertEvidence,
      countEvidenceByKind,
    } as unknown as MaintenanceEvidenceRepository;
    const service = new MaintenanceEvidenceService(repository);
    const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });

    await service.uploadEvidence({
      job_id: "job-1",
      kind: "before",
      file,
      created_by: "user-1",
    });

    expect(countEvidenceByKind).toHaveBeenCalledWith("job-1", "before");
    expect(uploadFile).toHaveBeenCalledWith(
      "maintenance/job-1/avant/photo_1.jpg",
      file,
      false,
    );
    expect(insertEvidence).toHaveBeenCalledWith(
      "job-1",
      "before",
      "maintenance/job-1/avant/photo_1.jpg",
      "user-1",
    );
  });

  it("incrémente le numéro de photo pour un même kind", async () => {
    const uploadFile = vi.fn().mockResolvedValue(undefined);
    const insertEvidence = vi.fn().mockResolvedValue({
      id: "ev-2",
      job_id: "job-1",
      kind: "after",
      file_path: "maintenance/job-1/apres/photo_2.png",
      created_by: "user-1",
      created_at: "2026-06-24T00:00:00.000Z",
    });
    const countEvidenceByKind = vi.fn().mockResolvedValue(1);
    const repository = {
      uploadFile,
      insertEvidence,
      countEvidenceByKind,
    } as unknown as MaintenanceEvidenceRepository;
    const service = new MaintenanceEvidenceService(repository);
    const file = new File(["x"], "proof.png", { type: "image/png" });

    await service.uploadEvidence({
      job_id: "job-1",
      kind: "after",
      file,
      created_by: "user-1",
    });

    expect(uploadFile).toHaveBeenCalledWith(
      "maintenance/job-1/apres/photo_2.png",
      file,
      false,
    );
  });
});
