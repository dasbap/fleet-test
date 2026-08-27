import { beforeEach, describe, expect, it, vi } from "vitest";

const requirePermission = vi.fn();
const canManageRole = vi.fn();
class RbacError extends Error {
  constructor(message: string, public code: string, public permission: string) { super(message); }
}
vi.mock("@/lib/rbac/server", () => ({ requirePermission, RbacError }));
vi.mock("@/lib/rbac/permissions", () => ({ canManageRole }));

import { FleetMemberService } from "@/services/fleet-member.service";
import { MaintenanceService } from "@/services/maintenance.service";

describe("fleet member mutation coverage", () => {
  let repository: any;
  let service: FleetMemberService;

  beforeEach(() => {
    vi.clearAllMocks();
    requirePermission.mockResolvedValue("organizer");
    canManageRole.mockReturnValue(true);
    repository = {
      findActiveRowsForUser: vi.fn(), findAllViaRpc: vi.fn(), findAll: vi.fn(), findById: vi.fn(), addMemberByEmail: vi.fn(), updateMemberPhone: vi.fn(), updateRoleViaRpc: vi.fn(), upsertMembership: vi.fn(), offboardMember: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(),
    };
    service = new FleetMemberService(repository);
  });

  it("deduplicates active memberships by fleet", async () => {
    await expect(service.getActiveMembershipsForUser("")).resolves.toEqual([]);
    repository.findActiveRowsForUser.mockResolvedValue([
      { id: "m1", fleet_id: "f1", role: "driver", is_active: true },
      { id: "m2", fleet_id: "f1", role: "manager", is_active: true },
      { id: "m3", fleet_id: "f2", role: "mechanic", is_active: true },
    ]);
    await expect(service.getActiveMembershipsForUser("u")).resolves.toEqual([
      { id: "m1", fleet_id: "f1", role: "driver", is_active: true },
      { id: "m3", fleet_id: "f2", role: "mechanic", is_active: true },
    ]);
  });

  it("covers fleet member reads and guards", async () => {
    await expect(service.getFleetMembers("")).resolves.toEqual([]);
    repository.findAllViaRpc.mockResolvedValue([{ id: "m" }]);
    await expect(service.getFleetMembers("f")).resolves.toEqual([{ id: "m" }]);
    expect(requirePermission).toHaveBeenCalledWith("member.view", "f");
    expect(repository.findAllViaRpc).toHaveBeenCalledWith("f");
    repository.findAll.mockResolvedValue([{ id: "x" }]);
    await expect(service.getAllMembers({ role: "driver" } as any)).resolves.toEqual([{ id: "x" }]);
    await expect(service.getMemberById("")).rejects.toThrow("L'ID du membre est requis");
    repository.findById.mockResolvedValue({ id: "m" });
    await expect(service.getMemberById("m")).resolves.toEqual({ id: "m" });
  });

  it("validates email member creation inputs", async () => {
    await expect(service.addMemberByEmail("", "a@b.com", "driver")).rejects.toThrow("L'ID de la flotte est requis");
    await expect(service.addMemberByEmail("f", "", "driver")).rejects.toThrow("L'email est requis");
    await expect(service.addMemberByEmail("f", "bad", "driver")).rejects.toThrow("Format d'email invalide");
    await expect(service.addMemberByEmail("f", "a@b.com", "bad" as any)).rejects.toThrow("Rôle invalide");
  });

  it("normalizes email and optionally updates phone", async () => {
    repository.addMemberByEmail.mockResolvedValue("membership-1");
    repository.updateMemberPhone.mockResolvedValue(undefined);
    await service.addMemberByEmail("f", "  USER@Example.COM ", "driver", "+237600");
    expect(requirePermission).toHaveBeenCalledWith("member.invite", "f");
    expect(canManageRole).toHaveBeenCalledWith("organizer", "driver");
    expect(repository.addMemberByEmail).toHaveBeenCalledWith("f", "user@example.com", "driver");
    expect(repository.updateMemberPhone).toHaveBeenCalledWith("membership-1", "+237600");
    repository.updateMemberPhone.mockRejectedValueOnce(new Error("profile"));
    await expect(service.addMemberByEmail("f", "a@b.com", "driver", "+237")).resolves.toBeUndefined();
    repository.addMemberByEmail.mockResolvedValueOnce(null);
    repository.updateMemberPhone.mockClear();
    await service.addMemberByEmail("f", "a@b.com", "driver", "+237");
    expect(repository.updateMemberPhone).not.toHaveBeenCalled();
  });

  it("rejects unmanageable roles and maps repository errors", async () => {
    canManageRole.mockReturnValue(false);
    await expect(service.addMemberByEmail("f", "a@b.com", "organizer")).rejects.toThrow("Impossible d'ajouter le membre à la flotte.");
    canManageRole.mockReturnValue(true);
    for (const [message, expected] of [
      ["User not found", "Aucun utilisateur trouvé"],
      ["user_not_found", "Aucun utilisateur trouvé"],
      ["Permission denied", "Vous n'avez pas les droits"],
      ["permission_denied", "Vous n'avez pas les droits"],
      ["Fleet not found", "Flotte introuvable"],
      ["fleet_not_found", "Flotte introuvable"],
      ["duplicate key value", "déjà membre"],
      ["already exists", "déjà membre"],
      ["random", "Impossible d'ajouter le membre"],
    ]) {
      repository.addMemberByEmail.mockRejectedValueOnce(new Error(message));
      await expect(service.addMemberByEmail("f", "a@b.com", "driver")).rejects.toThrow(expected);
    }
    repository.addMemberByEmail.mockRejectedValueOnce("non-error");
    await expect(service.addMemberByEmail("f", "a@b.com", "driver")).rejects.toThrow("Impossible d'ajouter le membre");
  });

  it("validates and updates member roles", async () => {
    await expect(service.updateMemberRole("", "f", "u", "driver")).rejects.toThrow("L'ID du membership est requis");
    await expect(service.updateMemberRole("m", "", "u", "driver")).rejects.toThrow("L'ID de la flotte est requis");
    await expect(service.updateMemberRole("m", "f", "", "driver")).rejects.toThrow("L'ID de l'utilisateur est requis");
    await expect(service.updateMemberRole("m", "f", "u", "bad" as any)).rejects.toThrow("Rôle invalide");
    await service.updateMemberRole("m", "f", "u", "manager");
    expect(requirePermission).toHaveBeenCalledWith("member.update_role", "f");
    expect(repository.updateRoleViaRpc).toHaveBeenCalledWith("m", "manager");
  });

  it("covers active offboard remove and CRUD branches", async () => {
    await expect(service.setMemberActive("", "u", "driver", true)).rejects.toThrow("Flotte et utilisateur requis.");
    await expect(service.setMemberActive("f", "", "driver", true)).rejects.toThrow("Flotte et utilisateur requis.");
    await service.setMemberActive("f", "u", "driver", false);
    expect(repository.upsertMembership).toHaveBeenCalledWith("f", "u", "driver", false);
    await expect(service.offboardMember("", "f")).rejects.toThrow("Utilisateur et flotte requis.");
    await service.offboardMember("u", "f");
    expect(requirePermission).toHaveBeenCalledWith("member.remove", "f");
    expect(repository.offboardMember).toHaveBeenCalledWith("u", "f");
    await expect(service.removeMember("", "f")).rejects.toThrow("L'ID du membership est requis");
    await expect(service.removeMember("m", "")).rejects.toThrow("L'ID de la flotte est requis");
    repository.findById.mockResolvedValueOnce(null);
    await expect(service.removeMember("m", "f")).rejects.toThrow("Membre introuvable");
    repository.findById.mockResolvedValueOnce({ user_id: "u2", role: "mechanic" });
    await service.removeMember("m", "f");
    expect(repository.upsertMembership).toHaveBeenCalledWith("f", "u2", "mechanic", false);
    await expect(service.createMember({ fleet_id: "", user_id: "u", role: "driver" } as any)).rejects.toThrow("L'ID de la flotte est requis");
    await expect(service.createMember({ fleet_id: "f", user_id: "", role: "driver" } as any)).rejects.toThrow("L'ID de l'utilisateur est requis");
    await expect(service.createMember({ fleet_id: "f", user_id: "u", role: "" } as any)).rejects.toThrow("Le rôle est requis");
    repository.create.mockResolvedValue({ id: "new" });
    await expect(service.createMember({ fleet_id: "f", user_id: "u", role: "driver" } as any)).resolves.toEqual({ id: "new" });
    await expect(service.updateMember("", {})).rejects.toThrow("L'ID du membre est requis");
    repository.update.mockResolvedValue({ id: "m" });
    await expect(service.updateMember("m", { role: "manager" } as any)).resolves.toEqual({ id: "m" });
    await expect(service.deleteMember("")).rejects.toThrow("L'ID du membre est requis");
    await service.deleteMember("m");
    expect(repository.delete).toHaveBeenCalledWith("m");
  });
});

describe("maintenance service mutation coverage", () => {
  let repository: any;
  let service: MaintenanceService;

  beforeEach(() => {
    repository = {
      findAll: vi.fn(), findById: vi.fn(), findByIdWithEvidenceAndChecklist: vi.fn(), createEvidence: vi.fn(), createChecklist: vi.fn(), create: vi.fn(), findLatestByIncidentId: vi.fn(), verifyClosureReadiness: vi.fn(), update: vi.fn(), delete: vi.fn(),
    };
    service = new MaintenanceService(repository);
  });

  it("builds maintenance filters and delegates reads", async () => {
    repository.findAll.mockResolvedValue([]);
    await service.getMaintenanceJobs();
    expect(repository.findAll).toHaveBeenLastCalledWith({});
    await service.getMaintenanceJobs("f");
    expect(repository.findAll).toHaveBeenLastCalledWith({ fleet_id: "f" });
    await service.getMaintenanceJobs("f", "ready");
    expect(repository.findAll).toHaveBeenLastCalledWith({ fleet_id: "f", status: "ready" });
    await service.getAllMaintenanceJobs({ priority: "high" } as any);
    expect(repository.findAll).toHaveBeenLastCalledWith({ priority: "high" });
    await expect(service.getMaintenanceJobById("")).rejects.toThrow("L'ID du travail de maintenance est requis");
    repository.findById.mockResolvedValue({ id: "j" });
    await expect(service.getMaintenanceJobById("j")).resolves.toEqual({ id: "j" });
    await expect(service.getMaintenanceJobWithDetails("")).rejects.toThrow("L'ID du travail de maintenance est requis");
    repository.findByIdWithEvidenceAndChecklist.mockResolvedValue({ id: "j", evidence: [], checklist: null });
    await expect(service.getMaintenanceJobWithDetails("j")).resolves.toEqual({ id: "j", evidence: [], checklist: null });
  });

  it("validates evidence and checklist", async () => {
    for (const data of [{}, { job_id: "j" }, { job_id: "j", file_path: "p" }]) {
      await expect(service.addEvidence(data as any)).rejects.toThrow("job_id, file_path et created_by sont requis");
    }
    await expect(service.addEvidence({ job_id: "j", file_path: "p", created_by: "u", kind: "bad" } as any)).rejects.toThrow('kind doit être "before" ou "after"');
    repository.createEvidence.mockResolvedValue({ id: "e" });
    for (const kind of ["before", "after"] as const) {
      await expect(service.addEvidence({ job_id: "j", file_path: "p", created_by: "u", kind } as any)).resolves.toEqual({ id: "e" });
    }
    await expect(service.signChecklist({} as any)).rejects.toThrow("job_id et signed_by sont requis");
    await expect(service.signChecklist({ job_id: "j", signed_by: "u", items: null } as any)).rejects.toThrow("items doit être un objet");
    repository.createChecklist.mockResolvedValue({ id: "c" });
    await expect(service.signChecklist({ job_id: "j", signed_by: "u", items: {} } as any)).resolves.toEqual({ id: "c" });
  });

  it("validates maintenance creation", async () => {
    await expect(service.createMaintenanceJob({ fleet_id: "f" } as any)).rejects.toThrow("L'ID du véhicule est requis");
    await expect(service.createMaintenanceJob({ vehicle_id: "v" } as any)).rejects.toThrow("L'ID de la flotte est requis");
    await expect(service.createMaintenanceJob({ vehicle_id: "v", fleet_id: "f", priority: "bad" } as any)).rejects.toThrow("Priorité invalide");
    await expect(service.createMaintenanceJob({ vehicle_id: "v", fleet_id: "f", status: "bad" } as any)).rejects.toThrow("Statut invalide");
    repository.create.mockResolvedValue({ id: "j" });
    for (const priority of [undefined, "low", "medium", "high", "critical"] as any[]) {
      for (const status of [undefined, "queued", "in_progress", "ready", "blocked"] as any[]) {
        await expect(service.createMaintenanceJob({ vehicle_id: "v", fleet_id: "f", priority, status } as any)).resolves.toEqual({ id: "j" });
      }
    }
  });

  it("creates from incident or reuses queued/in-progress job", async () => {
    await expect(service.createFromIncident("", "v", "f")).rejects.toThrow("L'ID de l'incident est requis");
    await expect(service.createFromIncident("i", "", "f")).rejects.toThrow("L'ID du véhicule est requis");
    await expect(service.createFromIncident("i", "v", "")).rejects.toThrow("L'ID de la flotte est requis");
    for (const status of ["queued", "in_progress"]) {
      const existing = { id: "old", status };
      repository.findLatestByIncidentId.mockResolvedValueOnce(existing);
      await expect(service.createFromIncident("i", "v", "f")).resolves.toBe(existing);
    }
    repository.findLatestByIncidentId.mockResolvedValueOnce({ id: "ready", status: "ready" });
    repository.create.mockResolvedValueOnce({ id: "new" });
    await service.createFromIncident("i", "v", "f", undefined, "  note  ");
    expect(repository.create).toHaveBeenLastCalledWith({ vehicle_id: "v", fleet_id: "f", created_from_incident_id: "i", priority: "medium", status: "queued", notes: "note" });
    repository.findLatestByIncidentId.mockResolvedValueOnce(null);
    repository.create.mockResolvedValueOnce({ id: "new2" });
    await service.createFromIncident("i", "v", "f", "high", "   ");
    expect(repository.create).toHaveBeenLastCalledWith(expect.objectContaining({ priority: "high", notes: null }));
  });

  it("checks closure readiness", async () => {
    repository.verifyClosureReadiness.mockResolvedValueOnce({ peut_cloturer: false, message_blocage: "Photo manquante" });
    await expect(service.assertCanCloseMaintenance("j")).rejects.toThrow("Photo manquante");
    repository.verifyClosureReadiness.mockResolvedValueOnce({ peut_cloturer: false, message_blocage: null });
    await expect(service.assertCanCloseMaintenance("j")).rejects.toThrow("Impossible de clôturer cette intervention.");
    repository.verifyClosureReadiness.mockResolvedValueOnce({ peut_cloturer: true });
    await expect(service.assertCanCloseMaintenance("j")).resolves.toBeUndefined();
  });

  it("validates updates and verifies ready status", async () => {
    await expect(service.updateMaintenanceJob("", {})).rejects.toThrow("L'ID du travail de maintenance est requis");
    await expect(service.updateMaintenanceJob("j", { priority: "bad" } as any)).rejects.toThrow("Priorité invalide");
    await expect(service.updateMaintenanceJob("j", { status: "bad" } as any)).rejects.toThrow("Statut invalide");
    repository.update.mockResolvedValue({ id: "j" });
    repository.verifyClosureReadiness.mockResolvedValue({ peut_cloturer: true });
    await expect(service.updateMaintenanceJob("j", { priority: "critical", status: "ready" } as any)).resolves.toEqual({ id: "j" });
    expect(repository.verifyClosureReadiness).toHaveBeenCalledWith("j");
    await service.updateMaintenanceJob("j", { status: "blocked" } as any);
    expect(repository.update).toHaveBeenLastCalledWith("j", { status: "blocked" });
  });

  it("validates deletion", async () => {
    await expect(service.deleteMaintenanceJob("")).rejects.toThrow("L'ID du travail de maintenance est requis");
    repository.findById.mockResolvedValueOnce(null);
    await expect(service.deleteMaintenanceJob("j")).rejects.toThrow("Travail de maintenance introuvable");
    repository.findById.mockResolvedValueOnce({ id: "j" });
    repository.delete.mockResolvedValue(undefined);
    await service.deleteMaintenanceJob("j");
    expect(repository.delete).toHaveBeenCalledWith("j");
  });
});
