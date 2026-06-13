import type { SupabaseClient } from "@supabase/supabase-js";
import {
  toExpiringDoc,
  type ExpiringDoc,
} from "@/components/dashboard/alerts-list";
import { differenceInCalendarDays } from "date-fns";

interface DriverLicenseRow {
  id: string;
  license_number: string;
  license_category: string;
  expires_at: string;
}

/** Documents véhicules ; repli sur permis conducteurs si la table n'existe pas. */
export async function fetchExpiringDocs(
  supabase: SupabaseClient,
  fleetId: string,
  expiresBeforeIso: string,
): Promise<ExpiringDoc[]> {
  const vehicleResult = await supabase
    .from("vehicle_documents")
    .select("id, vehicle_id, doc_type, expires_at, vehicules(registration)")
    .eq("fleet_id", fleetId)
    .not("expires_at", "is", null)
    .lte("expires_at", expiresBeforeIso)
    .order("expires_at", { ascending: true })
    .limit(20);

  if (!vehicleResult.error && vehicleResult.data) {
    return vehicleResult.data.map(toExpiringDoc);
  }

  const licenseResult = await supabase
    .from("driver_licenses")
    .select("id, license_number, license_category, expires_at")
    .eq("fleet_id", fleetId)
    .not("expires_at", "is", null)
    .lte("expires_at", expiresBeforeIso.slice(0, 10))
    .order("expires_at", { ascending: true })
    .limit(20);

  if (licenseResult.error || !licenseResult.data) {
    return [];
  }

  return (licenseResult.data as DriverLicenseRow[]).map((row) => ({
    id: row.id,
    vehicle_id: row.id,
    doc_type: "driver_license",
    expires_at: row.expires_at,
    days_remaining: differenceInCalendarDays(
      new Date(row.expires_at),
      new Date(),
    ),
    registration: `${row.license_category} · ${row.license_number}`,
  }));
}
