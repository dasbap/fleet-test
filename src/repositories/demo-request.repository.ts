import { createEphemeralSupabaseClient } from "@/integrations/supabase/client";

export interface DemoRequestInsert {
  full_name: string;
  email: string;
  company?: string | null;
  phone: string;
  company_identifier: string;
  country_code: string;
}

function mapDemoInsertError(error: { code?: string; message?: string; details?: string | null }): Error {
  if (error.code === "23505") {
    return new Error("Cette adresse e-mail a déjà été utilisée pour une demande E-Samba.");
  }

  const message = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  if (error.code === "42501" || message.includes("row-level security") || message.includes("permission denied")) {
    console.error("[E-Samba config] Le schéma/RLS Supabase de cet environnement n'est pas synchronisé. Appliquer les migrations et exécuter npm run supabase:push-auth-config.");
    return new Error("Le service de demande de démo n'est pas encore configuré sur cet environnement. Réessayez plus tard.");
  }

  if (message.includes("jwt") || message.includes("token") || message.includes("unauthorized")) {
    return new Error("Votre vérification e-mail a expiré. Demandez un nouveau code E-Samba.");
  }

  return new Error(error.message || "Impossible d'envoyer la demande de démo.");
}

export class DemoRequestRepository {
  async create(input: DemoRequestInsert, verificationAccessToken: string): Promise<void> {
    const client = createEphemeralSupabaseClient(verificationAccessToken);
    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser(verificationAccessToken);

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

    const { error } = await client.from("demo_requests").insert(payload);

    if (error) {
      console.error("Erreur création demande démo:", error);
      throw mapDemoInsertError(error);
    }
  }
}
