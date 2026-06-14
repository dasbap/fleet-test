import {
  DashcamRepository,
  type DashcamAiAlertPayload,
  type DashcamAlertRow,
  type DashcamRow,
  type RegisterDashcamInput,
} from "@/repositories/dashcam.repository";

export type {
  DashcamRow as Dashcam,
  DashcamAlertRow as DashcamAlert,
  RegisterDashcamInput,
  DashcamAiAlertPayload,
};

/**
 * Logique métier dashcam IA.
 */
export class DashcamService {
  constructor(private repository: DashcamRepository) {}

  async listDashcams(fleetId: string): Promise<DashcamRow[]> {
    if (!fleetId) {
      throw new Error("L'identifiant de flotte est requis");
    }
    return this.repository.findByFleet(fleetId);
  }

  async listAlerts(fleetId: string, limit = 50): Promise<DashcamAlertRow[]> {
    if (!fleetId) {
      throw new Error("L'identifiant de flotte est requis");
    }
    if (limit < 1) {
      throw new Error("La limite doit être positive");
    }
    return this.repository.findAlertsByFleet(fleetId, limit);
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    if (!alertId) {
      throw new Error("L'identifiant de l'alerte est requis");
    }
    await this.repository.acknowledgeAlert(alertId);
  }

  async registerDashcam(input: RegisterDashcamInput): Promise<DashcamRow> {
    const name = input.name.trim();
    const brand = input.brand.trim();

    if (!input.fleet_id) {
      throw new Error("L'identifiant de flotte est requis");
    }
    if (!name) {
      throw new Error("Le nom de la dashcam est requis");
    }
    if (!brand) {
      throw new Error("La marque est requise");
    }

    return this.repository.register({
      ...input,
      name,
      brand,
    });
  }

  async sendAlerts(alerts: DashcamAiAlertPayload[]) {
    if (!alerts.length) {
      throw new Error("Au moins une alerte est requise");
    }
    return this.repository.sendAiAlerts(alerts);
  }
}
