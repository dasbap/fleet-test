import type { SupabaseClient } from "@supabase/supabase-js";

export interface CreateFleetInput {
  orgName: string;
  fleetName: string;
  collectionPolicy: "cash" | "momo" | "mix";
  countryCode: string;
  orgPhone?: string;
  orgCity?: string;
  sector?: string;
}

export interface CreateFleetResult {
  orgId: string;
  fleetId: string;
}

export interface CreateVehicleInput {
  fleetId: string;
  registration: string;
  brand?: string;
  model?: string;
  year?: number;
}

export interface AcceptInvitationResult {
  ok: boolean;
  error?: string | null;
  fleet_id?: string;
  membership_id?: string;
}

const CEMAC_COUNTRIES = ["CM", "SN", "CI", "GA", "BF", "CD", "TG", "BJ"] as const;
export type CemacCountryCode = (typeof CEMAC_COUNTRIES)[number];

export function isCemacCountryCode(value: string): value is CemacCountryCode {
  return (CEMAC_COUNTRIES as readonly string[]).includes(value);
}

function normalizeRpcResult(data: unknown): AcceptInvitationResult | null {
  if (data == null) return null;
  if (Array.isArray(data)) {
    const first = data[0];
    return typeof first === "object" && first !== null && "ok" in first
      ? (first as AcceptInvitationResult)
      : null;
  }
  return typeof data === "object" && data !== null && "ok" in data
    ? (data as AcceptInvitationResult)
    : null;
}

function generateInvitationCode(): string {
  const suffix = globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
  return `ESAMBA-${suffix}`;
}

export async function createFleetOnboarding(
  supabase: SupabaseClient,
  input: CreateFleetInput,
): Promise<CreateFleetResult> {
  const { data, error } = await supabase.rpc(
    "creer_onboarding_organisation_flotte_et_adhesion",
    {
      p_org_name: input.orgName.trim(),
      p_country_code: input.countryCode.trim().toUpperCase(),
      p_fleet_name: input.fleetName.trim(),
      p_collection_policy: input.collectionPolicy,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  const row = data as { org_id?: string; fleet_id?: string } | null;
  if (!row?.org_id || !row?.fleet_id) {
    throw new Error("Réponse serveur incomplète après création de flotte.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && input.orgPhone?.trim()) {
    await supabase.from("profils").upsert({
      user_id: user.id,
      phone: input.orgPhone.trim(),
    });
  }

  return { orgId: row.org_id, fleetId: row.fleet_id };
}

export async function createFirstVehicle(
  supabase: SupabaseClient,
  input: CreateVehicleInput,
): Promise<string> {
  const { data, error } = await supabase.rpc("creer_vehicule_esamba", {
    p_fleet_id: input.fleetId,
    p_registration: input.registration.trim().toUpperCase(),
    p_brand: input.brand?.trim() || "Inconnu",
    p_model: input.model?.trim() || "Inconnu",
    p_year: input.year ?? null,
    p_current_km: 0,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Impossible de créer le véhicule.");
  }

  return data as string;
}

/** Génère un code d'invitation flotte (partage manuel — envoi email à venir). */
export async function createFleetInvitationCode(
  supabase: SupabaseClient,
  fleetId: string,
): Promise<string> {
  const code = generateInvitationCode();
  const { data, error } = await supabase.rpc("creer_invitation_esamba", {
    p_fleet_id: fleetId,
    p_code: code,
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data as string) ?? code;
}

export async function acceptInvitationCode(
  supabase: SupabaseClient,
  code: string,
): Promise<AcceptInvitationResult> {
  const { data, error } = await supabase.rpc("accepter_invitation", {
    p_code: code.trim(),
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return normalizeRpcResult(data) ?? { ok: false, error: "invalid_response" };
}
