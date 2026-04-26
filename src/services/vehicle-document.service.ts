import {
  VehicleDocumentRepository,
  type ExpiringVehicleDocument,
} from "@/repositories/vehicle-document.repository";

/**
 * Logique métier de conformité documentaire flotte.
 */
export class VehicleDocumentService {
  constructor(private repository: VehicleDocumentRepository) {}

  async getExpiringDocuments(
    fleetId: string,
    daysAhead = 30,
  ): Promise<ExpiringVehicleDocument[]> {
    if (!fleetId) {
      return [];
    }

    if (daysAhead < 1 || daysAhead > 365) {
      throw new Error("La fenêtre d'expiration doit être comprise entre 1 et 365 jours.");
    }

    const now = new Date();
    const deadline = new Date(now);
    deadline.setDate(now.getDate() + daysAhead);

    return this.repository.findExpiringByFleet(
      fleetId,
      deadline.toISOString().slice(0, 10),
    );
  }
}
