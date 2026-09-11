import { supabase } from "@/integrations/supabase/client";

export type VehicleGpsTrackerStatus = "active" | "inactive" | "maintenance";

export interface VehicleGpsTracker {
  id: string;
  vehicle_id: string;
  fleet_id: string;
  device_identifier: string;
  provider: string | null;
  status: VehicleGpsTrackerStatus;
  installed_at: string;
  updated_at: string;
}

export interface VehicleGpsTrackerInput {
  vehicleId: string;
  deviceIdentifier: string;
  provider?: string;
  status: VehicleGpsTrackerStatus;
}

function mapGpsTrackerError(message: string): string {
  if (message.includes("gps_tracker_organizer_required")) {
    return "Seul l'organisateur de la flotte peut configurer le traceur GPS.";
  }
  if (message.includes("gps_tracker_access_denied")) {
    return "Vous n'avez pas accès au traceur GPS de ce véhicule.";
  }
  if (message.includes("gps_tracker_identifier_invalid")) {
    return "L'identifiant du traceur doit contenir entre 6 et 64 caractères alphanumériques.";
  }
  if (message.includes("gps_tracker_already_assigned")) {
    return "Ce traceur GPS est déjà associé à un autre véhicule.";
  }
  if (message.includes("gps_tracker_status_invalid")) {
    return "Le statut du traceur GPS est invalide.";
  }
  if (message.includes("gps_tracker_provider_too_long")) {
    return "Le nom du fournisseur GPS est trop long.";
  }
  if (message.includes("vehicle_not_found")) {
    return "Véhicule introuvable.";
  }
  return message;
}

export class VehicleGpsTrackerService {
  async get(vehicleId: string): Promise<VehicleGpsTracker | null> {
    const { data, error } = await supabase.rpc("get_vehicle_gps_tracker", {
      p_vehicle_id: vehicleId,
    });
    if (error) throw new Error(mapGpsTrackerError(error.message));
    if (!data || typeof data !== "object" || Array.isArray(data)) return null;
    return data as unknown as VehicleGpsTracker;
  }

  async save(input: VehicleGpsTrackerInput): Promise<VehicleGpsTracker> {
    const { data, error } = await supabase.rpc("upsert_vehicle_gps_tracker", {
      p_vehicle_id: input.vehicleId,
      p_device_identifier: input.deviceIdentifier,
      p_provider: input.provider?.trim() || null,
      p_status: input.status,
    });
    if (error) throw new Error(mapGpsTrackerError(error.message));
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Réponse GPS invalide.");
    }
    return data as unknown as VehicleGpsTracker;
  }

  async remove(vehicleId: string): Promise<void> {
    const { data, error } = await supabase.rpc("remove_vehicle_gps_tracker", {
      p_vehicle_id: vehicleId,
    });
    if (error) throw new Error(mapGpsTrackerError(error.message));
    if (!data || typeof data !== "object" || Array.isArray(data) || (data as { ok?: boolean }).ok !== true) {
      throw new Error("Impossible de retirer le traceur GPS.");
    }
  }
}
