import type { SupabaseClient } from "@supabase/supabase-js";

// ─── Types ──────────────────────────────────────────────────

export interface GeneratedQr {
  qrId: string;
  code: string;
  expiresAt: string;
  /** URL à encoder dans le QR visuel : ouvre la page de scan E-Samba. */
  scanUrl: string;
}

export interface QrScanResult {
  status: "success" | "rejected";
  reason?: string;
  message: string;
  vehicleIds?: string[];
  activatedAt?: string;
}

const APP_BASE_URL = process.env.VITE_APP_URL ?? "https://app.e-samba.com";

function buildScanUrl(code: string): string {
  return `${APP_BASE_URL}/dashboard/scan?qr=${encodeURIComponent(code)}`;
}

// ─── createVehicleLicenses ──────────────────────────────────

interface CreateLicensesArgs {
  fleetId: string;
  subscriptionId: string;
  vehicleCount: number;
  vehicleIds?: string[];
  startsAt: string;
  endsAt: string;
}

/**
 * Crée ou met à jour les droits_vehicules pour un abonnement activé.
 * Idempotent via upsert sur (vehicle_id, subscription_id).
 */
export async function createVehicleLicenses(
  admin: SupabaseClient,
  args: CreateLicensesArgs,
): Promise<void> {
  const { fleetId, subscriptionId, vehicleCount, vehicleIds, startsAt, endsAt } = args;

  let ids: string[];

  if (vehicleIds?.length) {
    // Vérifie que les véhicules appartiennent à la flotte
    const { data, error } = await admin
      .from("vehicules")
      .select("id")
      .eq("fleet_id", fleetId)
      .in("id", vehicleIds)
      .returns<{ id: string }[]>();

    if (error) throw new Error(error.message);
    ids = (data ?? []).map((r) => r.id);
  } else {
    // Prend les N premiers véhicules de la flotte par date de création
    const { data, error } = await admin
      .from("vehicules")
      .select("id")
      .eq("fleet_id", fleetId)
      .order("created_at", { ascending: true })
      .limit(vehicleCount)
      .returns<{ id: string }[]>();

    if (error) throw new Error(error.message);
    ids = (data ?? []).map((r) => r.id);
  }

  if (!ids.length) return;

  const rows = ids.map((vehicleId) => ({
    vehicle_id: vehicleId,
    subscription_id: subscriptionId,
    active: true,
    status: "active",
    is_premium: false,
    starts_at: startsAt,
    ends_at: endsAt,
  }));

  const { error } = await admin
    .from("droits_vehicules")
    .upsert(rows, { onConflict: "vehicle_id,subscription_id" });

  if (error) throw new Error(error.message);
}

// ─── generateVehicleQr ──────────────────────────────────────

/**
 * Génère un QR d'activation usage unique pour un véhicule.
 * Bloqué si blocage disciplinaire actif.
 */
export async function generateVehicleQr(
  admin: SupabaseClient,
  vehicleId: string,
  subscriptionId: string,
  createdBy: string,
  opts?: { expiresHours?: number; maxUses?: number },
): Promise<GeneratedQr> {
  const { data, error } = await admin.rpc("qr_generate_vehicle", {
    p_vehicle_id: vehicleId,
    p_subscription_id: subscriptionId,
    p_created_by: createdBy,
    p_expires_hours: opts?.expiresHours ?? 24,
    p_max_uses: opts?.maxUses ?? 1,
  });

  if (error) throw new Error(error.message);
  if (!data?.[0]) throw new Error("Génération QR échouée.");

  const row = data[0] as { qr_id: string; code: string; expires_at: string };
  return {
    qrId: row.qr_id,
    code: row.code,
    expiresAt: row.expires_at,
    scanUrl: buildScanUrl(row.code),
  };
}

// ─── generateFleetLotQr ─────────────────────────────────────

/**
 * Génère un QR lot pour activer plusieurs véhicules d'un coup.
 * Usage unique, expire dans 48h par défaut.
 */
export async function generateFleetLotQr(
  admin: SupabaseClient,
  fleetId: string,
  vehicleIds: string[],
  subscriptionId: string,
  createdBy: string,
  opts?: { expiresHours?: number },
): Promise<GeneratedQr> {
  const { data, error } = await admin.rpc("qr_generate_fleet_lot", {
    p_fleet_id: fleetId,
    p_vehicle_ids: vehicleIds,
    p_subscription_id: subscriptionId,
    p_created_by: createdBy,
    p_expires_hours: opts?.expiresHours ?? 48,
  });

  if (error) throw new Error(error.message);
  if (!data?.[0]) throw new Error("Génération QR lot échouée.");

  const row = data[0] as { qr_id: string; code: string; expires_at: string };
  return {
    qrId: row.qr_id,
    code: row.code,
    expiresAt: row.expires_at,
    scanUrl: buildScanUrl(row.code),
  };
}

// ─── scanActivationQr ───────────────────────────────────────

/**
 * Valide et applique un scan QR d'activation.
 * Toutes les vérifications (expiry, quota, blocage, abonnement) sont faites côté DB.
 */
export async function scanActivationQr(
  admin: SupabaseClient,
  code: string,
  scannerId: string,
): Promise<QrScanResult> {
  const { data, error } = await admin.rpc("qr_scan_activation", {
    p_code: code,
    p_scanner_id: scannerId,
  });

  if (error) throw new Error(error.message);

  const result = data as {
    status: "success" | "rejected";
    reason?: string;
    message?: string;
    vehicle_ids?: string[];
    activated_at?: string;
  };

  return {
    status: result.status,
    reason: result.reason,
    message: result.message ?? (result.status === "success" ? "Activation réussie" : "Scan refusé"),
    vehicleIds: result.vehicle_ids,
    activatedAt: result.activated_at,
  };
}

// ─── confirmQrActivation ────────────────────────────────────

/**
 * Pour les QR à confirmation en deux temps (ex : QR lot avec validation gestionnaire).
 * Passe le jeton de pending → active après validation manuelle.
 */
export async function confirmQrActivation(
  admin: SupabaseClient,
  qrId: string,
  confirmedBy: string,
): Promise<void> {
  const { error } = await admin
    .from("jetons_qr")
    .update({ status: "active" })
    .eq("id", qrId)
    .eq("status", "pending");

  if (error) throw new Error(error.message);

  // Log confirmation
  await admin
    .from("journal_scans_qr")
    .insert({
      qr_token_id: qrId,
      scanned_by_user_id: confirmedBy,
      result: "success",
      status: "success",
      details: { event: "confirmed_by_manager", confirmed_by: confirmedBy },
    })
    .then(() => void 0);
}

// ─── revokeQr ───────────────────────────────────────────────

/** Révoque immédiatement un jeton QR (en cas d'erreur ou de vol). */
export async function revokeQr(
  admin: SupabaseClient,
  qrId: string,
  revokedBy: string,
): Promise<void> {
  const { error } = await admin
    .from("jetons_qr")
    .update({ status: "revoked", revoked_at: new Date().toISOString(), revoked_by: revokedBy })
    .eq("id", qrId)
    .neq("status", "revoked");

  if (error) throw new Error(error.message);
}
