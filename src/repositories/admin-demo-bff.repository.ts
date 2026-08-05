const BFF_CREATE_PROSPECT = "/api/admin/create-prospect";
const BFF_GENERATE_MAGIC_LINK = "/api/admin/generate-magic-link";

export interface CreateProspectPayload {
  email: string;
  company_name?: string;
  account_type?: "prospect" | "investor" | "internal" | "dev";
  fleet_id?: string;
  trial_days: number;
  send_email: boolean;
  permanent_access?: boolean;
}

export interface CreateProspectResult {
  ok: boolean;
  user_id?: string;
  fleet_id?: string;
  permanent_access?: boolean;
  error?: string;
}

export interface GenerateMagicLinkPayload {
  user_id: string;
  fleet_id?: string | null;
  email: string;
  label?: string;
}

export interface GenerateMagicLinkResult {
  ok: boolean;
  magic_url?: string;
  error?: string;
}

async function readBffJson<T extends { ok: boolean; error?: string }>(
  res: Response,
  unavailableError: string,
): Promise<T & { rateLimited?: boolean }> {
  if (res.status === 429) {
    return { ok: false, rateLimited: true } as T & { rateLimited?: boolean };
  }

  const text = await res.text();
  let data: Partial<T> | null = null;
  if (text.length > 0) {
    try {
      data = JSON.parse(text) as Partial<T>;
    } catch {
      data = null;
    }
  }
  if (!res.ok) {
    return {
      ok: false,
      error: data?.error ?? unavailableError,
    } as T & { rateLimited?: boolean };
  }

  return (data ?? { ok: false, error: unavailableError }) as T & { rateLimited?: boolean };
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

    return readBffJson<CreateProspectResult>(res, "bff_route_unavailable");
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

    return readBffJson<GenerateMagicLinkResult>(res, "bff_route_unavailable");
  }
}
