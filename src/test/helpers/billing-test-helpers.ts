/**
 * Helpers partagés pour les tests d'intégration billing E-Samba.
 *
 * Utilisation : importé dans billing.integration.test.ts uniquement.
 * Nécessite RUN_SUPABASE_INTEGRATION=1 + SUPABASE_SERVICE_ROLE_KEY.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ─── Clients Supabase ────────────────────────────────────────────────────────

export function makeAdminClient(): SupabaseClient {
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) throw new Error("SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY requis");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// ─── Seed : organisation + flotte ────────────────────────────────────────────

export interface TestTenant {
  orgId: string;
  fleetId: string;
  vehicleIds: string[];
}

/**
 * Crée une organisation, une flotte et N véhicules en mode service_role.
 * Le tag `tag` est injecté dans les noms pour faciliter le nettoyage.
 */
export async function seedTenant(
  admin: SupabaseClient,
  tag: string,
  vehicleCount = 3,
): Promise<TestTenant> {
  // Organisation
  const { data: org, error: orgErr } = await admin
    .from("organisations")
    .insert({ name: `Test Org ${tag}`, country_code: "CM" })
    .select("id")
    .single();
  if (orgErr) throw new Error(`seedTenant org: ${orgErr.message}`);

  // Flotte
  const { data: fleet, error: fleetErr } = await admin
    .from("flottes")
    .insert({ org_id: org.id, name: `Flotte ${tag}`, collection_policy: "mix" })
    .select("id")
    .single();
  if (fleetErr) throw new Error(`seedTenant fleet: ${fleetErr.message}`);

  // Véhicules
  const vehicleRows = Array.from({ length: vehicleCount }, (_, i) => ({
    fleet_id: fleet.id,
    registration: `LT-${tag}-${i + 1}`,
    brand: "Toyota",
    model: "Hilux",
    status: "ok",
  }));

  const { data: vehicles, error: vErr } = await admin
    .from("vehicules")
    .insert(vehicleRows)
    .select("id");
  if (vErr) throw new Error(`seedTenant vehicles: ${vErr.message}`);

  return {
    orgId: org.id,
    fleetId: fleet.id,
    vehicleIds: (vehicles ?? []).map((v: { id: string }) => v.id),
  };
}

// ─── Seed : abonnement trial ──────────────────────────────────────────────────

export async function seedTrialSubscription(
  admin: SupabaseClient,
  fleetId: string,
  trialDays = 30,
): Promise<string> {
  const { data, error } = await admin.rpc("billing_start_trial", {
    p_fleet_id: fleetId,
    p_trial_days: trialDays,
  });
  if (error) throw new Error(`seedTrialSubscription: ${error.message}`);
  return data as string;
}

// ─── Seed : paiement + abonnement actif ──────────────────────────────────────

export async function seedActivePaidSubscription(
  admin: SupabaseClient,
  { orgId, fleetId }: Pick<TestTenant, "orgId" | "fleetId">,
  options: {
    planCode?: string;
    vehicleCount?: number;
    durationMonths?: number;
    providerReference?: string;
  } = {},
): Promise<{ paymentId: string; subscriptionId: string }> {
  const planCode = options.planCode ?? "starter";
  const vehicleCount = options.vehicleCount ?? 2;
  const durationMonths = options.durationMonths ?? 1;
  const ref = options.providerReference ?? `NOTCH-TEST-${Date.now()}`;

  // Récupérer le plan
  const { data: plan, error: planErr } = await admin
    .from("plans")
    .select("id")
    .eq("code", planCode)
    .single();
  if (planErr || !plan) throw new Error(`plan ${planCode} introuvable`);

  // Créer le paiement
  const { data: payment, error: payErr } = await admin
    .from("paiements")
    .insert({
      org_id: orgId,
      provider: "notch",
      provider_reference: ref,
      amount: 15000 * vehicleCount * durationMonths,
      currency: "XAF",
      status: "successful",
      external_ref: ref,
      idempotency_key: `idem-${ref}`,
      raw_payload: {
        planCode,
        vehicleCount,
        durationMonths,
        fleetId,
      },
    })
    .select("id")
    .single();
  if (payErr) throw new Error(`seedActivePaidSubscription paiement: ${payErr.message}`);

  const now = new Date();
  const endsAt = new Date(now);
  endsAt.setUTCMonth(endsAt.getUTCMonth() + durationMonths);

  // Créer l'abonnement actif
  const { data: sub, error: subErr } = await admin
    .from("abonnements")
    .insert({
      fleet_id: fleetId,
      plan_id: plan.id,
      payment_id: payment.id,
      starts_at: now.toISOString(),
      ends_at: endsAt.toISOString(),
      status: "active",
    })
    .select("id")
    .single();
  if (subErr) throw new Error(`seedActivePaidSubscription sub: ${subErr.message}`);

  return { paymentId: payment.id, subscriptionId: sub.id };
}

// ─── Seed : abonnement expiré ─────────────────────────────────────────────────

export async function seedExpiredSubscription(
  admin: SupabaseClient,
  { orgId, fleetId }: Pick<TestTenant, "orgId" | "fleetId">,
  planCode = "starter",
): Promise<string> {
  const { data: plan } = await admin
    .from("plans")
    .select("id")
    .eq("code", planCode)
    .single();
  if (!plan) throw new Error(`plan ${planCode} introuvable`);

  const expired = new Date(Date.now() - 2 * 86400_000); // il y a 2 jours
  const start = new Date(expired.getTime() - 30 * 86400_000);

  const { data: payment } = await admin
    .from("paiements")
    .insert({
      org_id: orgId,
      provider: "notch",
      amount: 15000,
      currency: "XAF",
      status: "successful",
      idempotency_key: `idem-expired-${Date.now()}`,
      raw_payload: { planCode, vehicleCount: 1, durationMonths: 1, fleetId },
    })
    .select("id")
    .single();

  const { data: sub, error } = await admin
    .from("abonnements")
    .insert({
      fleet_id: fleetId,
      plan_id: plan.id,
      payment_id: payment?.id ?? null,
      starts_at: start.toISOString(),
      ends_at: expired.toISOString(),
      status: "active", // encore "active" — le cron n'est pas passé
    })
    .select("id")
    .single();
  if (error) throw new Error(`seedExpiredSubscription: ${error.message}`);
  return sub.id;
}

// ─── Seed : jeton QR ──────────────────────────────────────────────────────────

export async function seedQrToken(
  admin: SupabaseClient,
  vehicleId: string,
  options: { expiresInDays?: number; expired?: boolean } = {},
): Promise<{ tokenId: string; token: string }> {
  const now = new Date();
  const expiresAt = new Date(now);

  if (options.expired) {
    expiresAt.setDate(expiresAt.getDate() - 1); // hier
  } else {
    expiresAt.setDate(expiresAt.getDate() + (options.expiresInDays ?? 90));
  }

  const token = `QR-TEST-${crypto.randomUUID()}`;
  const { data: vehicle, error: vehicleErr } = await admin
    .from("vehicules")
    .select("fleet_id")
    .eq("id", vehicleId)
    .single();
  if (vehicleErr) throw new Error(`seedQrToken vehicle: ${vehicleErr.message}`);

  const { data: userData, error: userErr } = await admin.auth.admin.createUser({
    email: `qr-${crypto.randomUUID()}@example.test`,
    password: `Qr-${crypto.randomUUID()}-test`,
    email_confirm: true,
  });
  if (userErr || !userData.user) {
    throw new Error(`seedQrToken auth user: ${userErr?.message ?? "user absent"}`);
  }

  const { data, error } = await admin
    .from("jetons_qr")
    .insert({
      fleet_id: vehicle.fleet_id,
      vehicle_id: vehicleId,
      code: token,
      token_hash: token,
      expires_at: expiresAt.toISOString(),
      status: "active",
      created_by: userData.user.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(`seedQrToken: ${error.message}`);

  return { tokenId: data.id, token };
}

// ─── Nettoyage ─────────────────────────────────────────────────────────────────

/**
 * Supprime toutes les données de test pour une organisation.
 * Ordre respecté pour éviter les violations FK.
 */
export async function cleanupTenant(admin: SupabaseClient, orgId: string): Promise<void> {
  // Récupérer les fleets de cette org
  const { data: fleets } = await admin
    .from("flottes")
    .select("id")
    .eq("org_id", orgId);
  const fleetIds = (fleets ?? []).map((f: { id: string }) => f.id);

  if (fleetIds.length > 0) {
    // Véhicules → QR tokens
    const { data: vehicles } = await admin
      .from("vehicules")
      .select("id")
      .in("fleet_id", fleetIds);
    const vehicleIds = (vehicles ?? []).map((v: { id: string }) => v.id);

    if (vehicleIds.length > 0) {
      await admin.from("jetons_qr").delete().in("vehicle_id", vehicleIds);
      await admin.from("droits_vehicules").delete().in("vehicle_id", vehicleIds);
      await admin.from("vehicules").delete().in("id", vehicleIds);
    }

    // Abonnements + paiements
    const { data: subs } = await admin
      .from("abonnements")
      .select("id, payment_id")
      .in("fleet_id", fleetIds);

    const paymentIds = (subs ?? [])
      .map((s: { payment_id: string | null }) => s.payment_id)
      .filter(Boolean) as string[];

    await admin.from("billing_events").delete().in("fleet_id", fleetIds);
    await admin.from("notification_queue").delete().in("fleet_id", fleetIds);
    await admin.from("abonnements").delete().in("fleet_id", fleetIds);

    if (paymentIds.length > 0) {
      await admin.from("payment_attempts").delete().in("payment_id", paymentIds);
      await admin.from("paiements").delete().in("id", paymentIds);
    }

    await admin.from("flottes").delete().in("id", fleetIds);
  }

  await admin.from("organisations").delete().eq("id", orgId);
}

// ─── Assertions utilitaires ────────────────────────────────────────────────────

export async function getActiveSubscription(
  admin: SupabaseClient,
  fleetId: string,
): Promise<{ id: string; status: string; ends_at: string; plan_code: string } | null> {
  const { data, error } = await admin
    .from("abonnements")
    .select("id, status, ends_at, plans(code)")
    .eq("fleet_id", fleetId)
    .in("status", ["trial", "active", "grace_period"])
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`getActiveSubscription: ${error.message}`);
  if (!data) return null;
  return {
    id: data.id,
    status: data.status,
    ends_at: data.ends_at,
    plan_code: (data.plans as { code: string } | null)?.code ?? "",
  };
}

export async function countVehiclesInFleet(
  admin: SupabaseClient,
  fleetId: string,
): Promise<number> {
  const { count } = await admin
    .from("vehicules")
    .select("id", { count: "exact", head: true })
    .eq("fleet_id", fleetId);
  return count ?? 0;
}

export async function canFleetCreateVehicle(
  admin: SupabaseClient,
  fleetId: string,
): Promise<boolean> {
  const { data, error } = await admin.rpc("can_create_vehicle", { p_fleet_id: fleetId });
  if (error) throw new Error(`can_create_vehicle RPC: ${error.message}`);
  return !!data;
}

export async function getPlanAccess(
  admin: SupabaseClient,
  fleetId: string,
): Promise<Record<string, unknown>> {
  const { data, error } = await admin.rpc("get_plan_access", { p_fleet_id: fleetId });
  if (error) throw new Error(`get_plan_access RPC: ${error.message}`);
  const access = data as Record<string, unknown>;
  return {
    ...access,
    can_add_vehicle: access.can_add_vehicle ?? access.canCreateVehicle,
    ai_enabled: access.ai_enabled ?? access.canUsePulse,
    reports_enabled: access.reports_enabled ?? access.canExportReports,
    finance_enabled: access.finance_enabled ?? access.canUseFinance,
  };
}
