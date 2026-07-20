import type { SupabaseClient } from "@supabase/supabase-js";
import type { FleetContext } from "@/lib/dashboard/session";
import { differenceInCalendarDays } from "date-fns";

export type DocumentStatus =
  | "valid"
  | "expiring_soon"
  | "expired"
  | "pending_renewal";

export interface FleetDocumentRow {
  id: string;
  source: "vehicle" | "driver";
  docType: string;
  docNumber: string | null;
  expiresAt: string | null;
  issuedAt: string | null;
  issuer: string | null;
  status: DocumentStatus;
  filePath: string | null;
  notes: string | null;
  vehicleId: string | null;
  vehicleRegistration: string | null;
  vehicleBrand: string | null;
  vehicleModel: string | null;
  driverUserId: string | null;
  driverName: string | null;
}

export interface DocumentsStats {
  total: number;
  expired: number;
  expiring_soon: number;
  valid: number;
}

export const DOC_LABELS: Record<string, string> = {
  insurance: "Assurance",
  registration: "Carte grise",
  grey_card: "Carte grise",
  technical: "Visite technique",
  technical_control: "Contrôle technique",
  vignette: "Vignette",
  transport_license: "Autorisation transport",
  driver_license: "Permis de conduire",
  drivers_license: "Permis de conduire",
  medical_certificate: "Certificat médical",
  other: "Autre",
};

function resolveStatus(
  expiresAt: string | null,
  verificationStatus?: string | null,
): DocumentStatus {
  if (verificationStatus === "pending") return "pending_renewal";
  if (!expiresAt) return "valid";
  const days = differenceInCalendarDays(new Date(expiresAt), new Date());
  if (days < 0) return "expired";
  if (days <= 30) return "expiring_soon";
  return "valid";
}

export function computeDocumentsStats(
  documents: FleetDocumentRow[],
): DocumentsStats {
  return {
    total: documents.length,
    expired: documents.filter((d) => d.status === "expired").length,
    expiring_soon: documents.filter((d) => d.status === "expiring_soon").length,
    valid: documents.filter(
      (d) => d.status === "valid" || d.status === "pending_renewal",
    ).length,
  };
}

export async function fetchDocumentsPageData(
  supabase: SupabaseClient,
  context: FleetContext,
): Promise<FleetDocumentRow[]> {
  const rows: FleetDocumentRow[] = [];

  const vehicleDocs = await supabase
    .from("vehicle_documents")
    .select(
      "id, doc_type, doc_number, expires_at, issued_at, issuer, file_path, notes, vehicle_id, vehicules(id, registration, brand, model)",
    )
    .eq("fleet_id", context.fleetId)
    .order("expires_at", { ascending: true });

  if (!vehicleDocs.error && vehicleDocs.data) {
    for (const doc of vehicleDocs.data) {
      const veh = doc.vehicules as
        | { id?: string; registration?: string; brand?: string; model?: string }
        | { id?: string; registration?: string; brand?: string; model?: string }[]
        | null;
      const vehicle = Array.isArray(veh) ? veh[0] : veh;

      rows.push({
        id: doc.id,
        source: "vehicle",
        docType: doc.doc_type,
        docNumber: doc.doc_number ?? null,
        expiresAt: doc.expires_at,
        issuedAt: doc.issued_at ?? null,
        issuer: doc.issuer ?? null,
        status: resolveStatus(doc.expires_at),
        filePath: doc.file_path,
        notes: doc.notes ?? null,
        vehicleId: vehicle?.id ?? doc.vehicle_id ?? null,
        vehicleRegistration: vehicle?.registration ?? null,
        vehicleBrand: vehicle?.brand ?? null,
        vehicleModel: vehicle?.model ?? null,
        driverUserId: null,
        driverName: null,
      });
    }
  }

  const { data: licenses } = await supabase
    .from("driver_licenses")
    .select(
      "id, license_category, license_number, issued_at, expires_at, issuing_country, verification_status, document_url, driver_user_id, profils(full_name)",
    )
    .eq("fleet_id", context.fleetId)
    .order("expires_at", { ascending: true });

  for (const license of licenses ?? []) {
    const profil = license.profils as
      | { full_name?: string | null }
      | { full_name?: string | null }[]
      | null;
    const name = Array.isArray(profil)
      ? profil[0]?.full_name
      : profil?.full_name;

    rows.push({
      id: license.id,
      source: "driver",
      docType: "driver_license",
      docNumber: license.license_number,
      expiresAt: license.expires_at,
      issuedAt: license.issued_at ?? null,
      issuer: license.issuing_country ?? null,
      status: resolveStatus(
        license.expires_at,
        license.verification_status,
      ),
      filePath: license.document_url,
      notes: null,
      vehicleId: null,
      vehicleRegistration: null,
      vehicleBrand: null,
      vehicleModel: null,
      driverUserId: license.driver_user_id,
      driverName: name ?? null,
    });
  }

  return rows.sort((a, b) => {
    if (!a.expiresAt && !b.expiresAt) return 0;
    if (!a.expiresAt) return 1;
    if (!b.expiresAt) return -1;
    return a.expiresAt.localeCompare(b.expiresAt);
  });
}
