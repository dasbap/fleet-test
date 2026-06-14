const BFF_CREATE_PROSPECT = "/api/admin/create-prospect";
const BFF_GENERATE_MAGIC_LINK = "/api/admin/generate-magic-link";

export interface CreateProspectPayload {
  email: string;
  company_name?: string;
  fleet_id?: string;
  trial_days: number;
  send_email: boolean;
}

export interface CreateProspectResult {
  ok: boolean;
  user_id?: string;
  fleet_id?: string;
  error?: string;
}

export interface GenerateMagicLinkPayload {
  user_id: string;
  fleet_id?: string;
  email: string;
  label?: string;
}

export interface GenerateMagicLinkResult {
  ok: boolean;
  magic_url?: string;
  error?: string;
}

/**
 * Appels BFF Vercel pour les actions admin démo sensibles (secret côté serveur).
 */
export class AdminDemoBffRepository {
  async createProspect(
    accessToken: string,
    payload: CreateProspectPayload,
  ): Promise<CreateProspectResult & { rateLimited?: boolean }> {
    const res = await fetch(BFF_CREATE_PROSPECT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.status === 429) {
      return { ok: false, rateLimited: true };
    }

    return (await res.json()) as CreateProspectResult;
  }

  async generateMagicLink(
    accessToken: string,
    payload: GenerateMagicLinkPayload,
  ): Promise<GenerateMagicLinkResult & { rateLimited?: boolean }> {
    const res = await fetch(BFF_GENERATE_MAGIC_LINK, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.status === 429) {
      return { ok: false, rateLimited: true };
    }

    return (await res.json()) as GenerateMagicLinkResult;
  }
}
