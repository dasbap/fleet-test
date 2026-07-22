import { supabase } from "@/integrations/supabase/client";

export interface DemoRequestInsert {
  full_name: string;
  email: string;
  company?: string | null;
  phone: string;
  company_identifier: string;
  country_code: string;
}

/**
 * Accès Supabase pour les demandes de démo (formulaire landing).
 */
export class DemoRequestRepository {
  async create(input: DemoRequestInsert): Promise<void> {
    const { error } = await supabase.from("demo_requests").insert({
      full_name: input.full_name,
      email: input.email,
      company: input.company ?? null,
      phone: input.phone,
      company_identifier: input.company_identifier,
      country_code: input.country_code,
    });

    if (error) {
      console.error("Erreur création demande démo:", error);
      throw new Error(error.message);
    }
  }
}
