import type { OfflineFuelCreatePayload } from "@/types/offline-queue";
import { FuelRepository, type FuelEntry } from "@/repositories/fuel.repository";

// ─── Anomaly detection ────────────────────────────────────────────────────────

/**
 * Détecte les entrées carburant dont la consommation aux 100 km dépasse le seuil.
 * Algorithme : pour chaque véhicule, trie par odomètre et calcule L/100km
 * entre deux pleins consécutifs. Retourne un Set des entryId anomaleux.
 *
 * Seuil par défaut : 30 L/100km (conservateur pour Afrique centrale, véhicules utilitaires)
 */
export function detectFuelOverconsumption(
  entries: FuelEntry[],
  threshold100km = 30,
): Set<string> {
  const byVehicle = new Map<string, FuelEntry[]>();
  for (const e of entries) {
    const list = byVehicle.get(e.vehicle_id) ?? [];
    list.push(e);
    byVehicle.set(e.vehicle_id, list);
  }

  const flagged = new Set<string>();
  for (const vehicleEntries of byVehicle.values()) {
    const sorted = [...vehicleEntries].sort(
      (a, b) => a.odometer_km - b.odometer_km,
    );
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const distanceKm = curr.odometer_km - prev.odometer_km;
      if (distanceKm <= 0) continue; // lecture odomètre invalide, on skip
      const consumption100km = (curr.liters / distanceKm) * 100;
      if (consumption100km > threshold100km) {
        flagged.add(curr.id);
      }
    }
  }
  return flagged;
}

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
