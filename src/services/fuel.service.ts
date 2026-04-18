import type { OfflineFuelCreatePayload } from "@/types/offline-queue";
import { FuelRepository } from "@/repositories/fuel.repository";

export interface FuelEntryInput {
  fleetId: string;
  vehicleId: string;
  driverUserId: string;
  liters: number;
  amountXof: number;
  odometerKm: number;
  purchasedAt?: string;
  stationName?: string | null;
  receiptRef?: string | null;
}

export class FuelService {
  constructor(private repository: FuelRepository) {}

  buildOfflinePayload(input: FuelEntryInput): OfflineFuelCreatePayload {
    this.validateInput(input);
    return {
      fleetId: input.fleetId,
      vehicleId: input.vehicleId,
      driverUserId: input.driverUserId,
      liters: input.liters,
      amountXof: input.amountXof,
      odometerKm: input.odometerKm,
      purchasedAt: input.purchasedAt ?? new Date().toISOString(),
      stationName: input.stationName ?? null,
      receiptRef: input.receiptRef ?? null,
    };
  }

  async createWithIdempotency(
    input: FuelEntryInput,
    idempotencyKey: string,
  ): Promise<void> {
    this.validateInput(input);
    if (!idempotencyKey) {
      throw new Error("La clé d'idempotence est requise");
    }
    await this.repository.create({
      fleet_id: input.fleetId,
      vehicle_id: input.vehicleId,
      driver_user_id: input.driverUserId,
      liters: input.liters,
      amount_xof: input.amountXof,
      odometer_km: input.odometerKm,
      purchased_at: input.purchasedAt ?? new Date().toISOString(),
      station_name: input.stationName ?? null,
      receipt_ref: input.receiptRef ?? null,
      idempotency_key: idempotencyKey,
    });
  }

  private validateInput(input: FuelEntryInput): void {
    if (!input.fleetId) throw new Error("L'ID de flotte est requis");
    if (!input.vehicleId) throw new Error("L'ID du véhicule est requis");
    if (!input.driverUserId) throw new Error("L'ID conducteur est requis");
    if (!(input.liters > 0)) throw new Error("Le volume de carburant doit être supérieur à zéro");
    if (input.amountXof < 0) throw new Error("Le montant carburant doit être positif");
    if (input.odometerKm < 0) throw new Error("Le kilométrage doit être positif");
  }
}
