import { supabase } from "@/integrations/supabase/client";

export interface DemoRequestInsert {
  full_name: string;
  email: string;
  company?: string | null;
  phone: string;
  company_identifier: string;
  country_code: string;
}

export class DemoRequestRepository {
  async create(input: DemoRequestInsert): Promise<void> {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user || !user.email || user.email.toLowerCase() !== input.email.toLowerCase()) {
      throw new Error("Vérifiez votre adresse e-mail avec le code E-Samba avant d'envoyer la demande.");
    }

    if (user.user_metadata?.demo_verification_pending !== true) {
      throw new Error("Cette adresse e-mail est déjà associée à un compte E-Samba.");
    }

    const payload = {
      full_name: input.full_name,
      email: input.email,
      company: input.company ?? null,
      phone: input.phone,
      company_identifier: input.company_identifier,
      country_code: input.country_code,
      verified_user_id: user.id,
    } as never;

    const { error } = await supabase.from("demo_requests").insert(payload);

    if (error) {
      console.error("Erreur création demande démo:", error);
      if (error.code === "23505") {
        throw new Error("Cette adresse e-mail a déjà été utilisée pour une demande E-Samba.");
      }
      throw new Error(error.message);
    }
  }
}
