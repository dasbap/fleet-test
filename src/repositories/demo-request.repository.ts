import { supabase } from "@/integrations/supabase/client";

export interface DemoRequestInsert {
  full_name: string;
  company?: string | null;
  phone: string;
  fleet_size?: number | null;
}

/**
 * Accès Supabase pour les demandes de démo (formulaire landing).
 */
export class DemoRequestRepository {
  async create(input: DemoRequestInsert): Promise<void> {
    const { error } = await supabase.from("demo_requests").insert({
      full_name: input.full_name,
      company: input.company ?? null,
      phone: input.phone,
      fleet_size: input.fleet_size ?? null,
    });

    if (error) {
      console.error("Erreur création demande démo:", error);
      throw new Error(error.message);
    }
  }
}
