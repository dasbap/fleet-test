import { supabase } from "@/integrations/supabase/client";

export interface ExpiringVehicleDocument {
  id: string;
  vehicle_id: string;
  doc_type: string;
  expires_at: string;
}

/**
 * Accès aux documents véhicules pour le suivi conformité.
 */
export class VehicleDocumentRepository {
  async findExpiringByFleet(
    fleetId: string,
    expiresBeforeIso: string,
  ): Promise<ExpiringVehicleDocument[]> {
    const { data, error } = await supabase
      .from("vehicle_documents")
      .select("id, vehicle_id, doc_type, expires_at")
      .eq("fleet_id", fleetId)
      .not("expires_at", "is", null)
      .lte("expires_at", expiresBeforeIso)
      .order("expires_at", { ascending: true })
      .limit(20);

    if (error) {
      console.error("Error fetching expiring vehicle documents:", error);
      throw new Error(error.message);
    }

    return (data ?? []) as ExpiringVehicleDocument[];
  }
}
