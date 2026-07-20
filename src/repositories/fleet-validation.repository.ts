import { supabase } from "@/integrations/supabase/client";
import { isValidUuid } from "@/lib/isUuid";
import { getSignedStorageUrl } from "@/lib/storage/signedUrl";
import type { CreneauValidationRow, KpisFlotteData } from "@/types/fleet-validation";

const CLOSURE_PROOF_BUCKET = "cloture-proofs";

export class FleetValidationRepository {
  async findActiveValidationsByFleet(fleetId: string): Promise<CreneauValidationRow[]> {
    const { data, error } = await supabase
      .from("v_creneaux_actifs_validations")
      .select("*")
      .eq("fleet_id", fleetId)
      .order("started_at", { ascending: false });

    if (error) {
      console.error("Erreur chargement validations créneaux:", error);
      throw new Error(error.message);
    }

    return (data ?? []) as CreneauValidationRow[];
  }

  async findActiveValidationByCreneauId(creneauId: string): Promise<CreneauValidationRow | null> {
    if (!isValidUuid(creneauId)) {
      return null;
    }

    const { data, error } = await supabase
      .from("v_creneaux_actifs_validations")
      .select("*")
      .eq("creneau_id", creneauId)
      .maybeSingle();

    if (error) {
      console.error("Erreur chargement créneau actif:", error);
      throw new Error(error.message);
    }

    return (data as CreneauValidationRow | null) ?? null;
  }

  async findFleetKpis(fleetId: string): Promise<KpisFlotteData | null> {
    const { data, error } = await supabase
      .from("v_kpis_flotte")
      .select("*")
      .eq("fleet_id", fleetId)
      .maybeSingle();

    if (error) {
      console.error("Erreur chargement KPIs flotte:", error);
      throw new Error(error.message);
    }

    return (data as KpisFlotteData | null) ?? null;
  }

  async getClosureProofSignedUrl(storedValue: string): Promise<string | null> {
    return getSignedStorageUrl(CLOSURE_PROOF_BUCKET, storedValue);
  }
}
