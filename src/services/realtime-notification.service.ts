import { RealtimeFleetRepository } from "@/repositories/realtime-fleet.repository";

interface RealtimeActionResult {
  toast?: {
    title: string;
    description: string;
    variant?: "default" | "destructive";
  };
  invalidateKeys: string[][];
}

export class RealtimeNotificationService {
  constructor(private readonly repository: RealtimeFleetRepository) {}

  async handleClosureInsert(
    payload: { shift_id?: string; revenue_declared?: number | null },
    fleetId: string,
  ): Promise<RealtimeActionResult | null> {
    if (!payload.shift_id) return null;

    const ctx = await this.repository.getClosureNotificationContext(
      payload.shift_id,
      payload,
      fleetId,
    );
    if (!ctx) return null;

    return {
      toast: {
        title: "Nouvelle clôture de créneau",
        description: `${ctx.driverFullName || "Un chauffeur"} a terminé son créneau avec ${ctx.revenueDeclared} FCFA de revenus.`,
      },
      invalidateKeys: [
        ["dashboard-stats"],
        ["recent-activity"],
        ["fleet-pending-closures"],
        ["operations"],
      ],
    };
  }

  async handleIncidentInsert(
    payload: { vehicle_id?: string; severity?: string; description?: string },
    fleetId: string,
  ): Promise<RealtimeActionResult | null> {
    if (!payload.vehicle_id) return null;

    const vehicle = await this.repository.getVehicleForIncident(payload.vehicle_id);
    if (!vehicle || vehicle.fleet_id !== fleetId) return null;

    const severityLabels: Record<string, string> = {
      low: "faible",
      medium: "moyenne",
      high: "haute",
      critical: "critique",
    };

    return {
      toast: {
        title: `Nouvel incident (${severityLabels[payload.severity ?? ""] || payload.severity})`,
        description: `Véhicule ${vehicle.registration || "inconnu"}: ${String(payload.description ?? "").slice(0, 50)}...`,
        variant: payload.severity === "critical" ? "destructive" : "default",
      },
      invalidateKeys: [["incidents"], ["dashboard-stats"], ["recent-activity"]],
    };
  }

  async handleMaintenanceInsert(
    payload: { fleet_id?: string; vehicle_id?: string; priority?: string },
    fleetId: string,
  ): Promise<RealtimeActionResult | null> {
    if (payload.fleet_id !== fleetId || !payload.vehicle_id) return null;

    const registration = await this.repository.getVehicleRegistration(payload.vehicle_id);
    const priorityLabels: Record<string, string> = {
      low: "basse",
      medium: "moyenne",
      high: "haute",
      critical: "critique",
    };

    return {
      toast: {
        title: "Nouvelle intervention de maintenance",
        description: `Véhicule ${registration || "inconnu"} - Priorité ${priorityLabels[payload.priority ?? ""] || payload.priority}`,
      },
      invalidateKeys: [["maintenance-jobs"], ["dashboard-stats"]],
    };
  }

  async handleMaintenanceUpdate(
    payload: {
      new: { id?: string; fleet_id?: string; vehicle_id?: string; status?: string };
      old: { status?: string };
    },
    fleetId: string,
  ): Promise<RealtimeActionResult | null> {
    const { new: job, old: oldJob } = payload;
    if (job.fleet_id !== fleetId || job.status === oldJob.status || !job.vehicle_id) {
      return null;
    }

    const registration = await this.repository.getVehicleRegistration(job.vehicle_id);
    const statusLabels: Record<string, string> = {
      queued: "en attente",
      in_progress: "en cours",
      ready: "terminée",
      blocked: "bloquée",
    };

    return {
      toast: {
        title: "Statut maintenance mis à jour",
        description: `${registration || "Véhicule"}: ${statusLabels[job.status ?? ""] || job.status}`,
      },
      invalidateKeys: [["maintenance-jobs"], ["maintenance-job", job.id ?? ""]],
    };
  }
}
