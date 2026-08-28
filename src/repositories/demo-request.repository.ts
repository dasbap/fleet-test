export interface DemoRequestInsert {
  full_name: string;
  email: string;
  company?: string | null;
  phone: string;
  company_identifier: string;
  country_code: string;
}

function mapDemoResponseError(status: number, error?: string): Error {
  if (status === 409 && error === "demo_email_already_used") {
    return new Error("Cette adresse e-mail a déjà été utilisée pour une demande E-Samba.");
  }
  if (status === 409 && error === "email_already_registered") {
    return new Error("Cette adresse e-mail est déjà associée à un compte E-Samba.");
  }
  if (status === 401 || error === "invalid_token" || error === "missing_auth_token") {
    return new Error("Votre vérification e-mail a expiré. Demandez un nouvel e-mail E-Samba.");
  }
  if (status === 403 && error === "verified_email_mismatch") {
    return new Error("L'adresse e-mail vérifiée ne correspond pas à la demande.");
  }
  if (status === 503 || error === "server_configuration_error") {
    return new Error("Le service de demande de démo n'est pas encore configuré sur cet environnement. Réessayez plus tard.");
  }
  return new Error("Impossible d'envoyer la demande de démo.");
}

export class DemoRequestRepository {
  async create(input: DemoRequestInsert, verificationAccessToken: string): Promise<void> {
    const response = await fetch("/api/demo/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${verificationAccessToken}`,
      },
      body: JSON.stringify({
        ...input,
        company: input.company ?? "",
      }),
    });

    let body: { ok?: boolean; error?: string } = {};
    try {
      body = (await response.json()) as { ok?: boolean; error?: string };
    } catch {
      // La réponse HTTP suffit pour produire un message UX stable.
    }

    if (!response.ok || body.ok !== true) {
      throw mapDemoResponseError(response.status, body.error);
    }
  }
}
