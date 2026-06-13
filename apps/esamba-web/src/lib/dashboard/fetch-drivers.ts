import type { SupabaseClient } from "@supabase/supabase-js";
import type { FleetContext } from "@/lib/dashboard/session";

export type DriverDisplayStatus = "active" | "inactive" | "on_leave";
export type DriverOperationalStatus = "on_mission" | "assigned" | "available";

export interface DriverVehicle {
  id: string;
  registration: string;
  brand: string | null;
  model: string | null;
}

export interface DriverRow {
  userId: string;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  avatarPath: string | null;
  createdAt: string;
  isActive: boolean;
  displayStatus: DriverDisplayStatus;
  operationalStatus: DriverOperationalStatus;
  licenseCategories: string[];
  licenseExpiresAt: string | null;
  safetyScore: number | null;
  vehicle: DriverVehicle | null;
}

export type DriverStatusCounts = Record<DriverDisplayStatus, number>;

function splitFullName(fullName: string | null): {
  firstName: string | null;
  lastName: string | null;
} {
  if (!fullName?.trim()) return { firstName: null, lastName: null };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0] ?? null, lastName: null };
  return {
    firstName: parts[0] ?? null,
    lastName: parts.slice(1).join(" ") || null,
  };
}

function resolveDisplayStatus(
  isActive: boolean,
  employmentStatus: string | null | undefined,
): DriverDisplayStatus {
  if (!isActive) return "inactive";
  if (employmentStatus === "suspended") return "on_leave";
  if (employmentStatus === "inactive") return "inactive";
  return "active";
}

function unwrapSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function computeDriverStatusCounts(
  drivers: DriverRow[],
): DriverStatusCounts {
  return drivers.reduce<DriverStatusCounts>(
    (acc, driver) => {
      acc[driver.displayStatus] += 1;
      return acc;
    },
    { active: 0, inactive: 0, on_leave: 0 },
  );
}

export async function fetchDriversPageData(
  supabase: SupabaseClient,
  context: FleetContext,
): Promise<DriverRow[]> {
  const [
    { data: adhesions },
    { data: assignments },
    { data: openShifts },
    { data: licenses },
    { data: scores },
  ] = await Promise.all([
    supabase
      .from("flotte_adhesions")
      .select(
        "user_id, is_active, created_at, profils(full_name, phone, employment_status)",
      )
      .eq("fleet_id", context.fleetId)
      .eq("role", "driver")
      .order("created_at", { ascending: false }),

    supabase
      .from("affectations_vehicules")
      .select("driver_user_id, vehicules(id, registration, brand, model)")
      .eq("fleet_id", context.fleetId)
      .eq("is_active", true)
      .is("ends_at", null),

    supabase
      .from("creneaux_conducteurs")
      .select("assignment_id, affectations_vehicules(driver_user_id)")
      .eq("fleet_id", context.fleetId)
      .is("closed_at", null),

    supabase
      .from("driver_licenses")
      .select("driver_user_id, license_category, expires_at, created_at")
      .eq("fleet_id", context.fleetId)
      .order("created_at", { ascending: false }),

    supabase
      .from("scores_conducteurs")
      .select("driver_user_id, score_total, financial_score")
      .eq("fleet_id", context.fleetId),
  ]);

  const vehicleByDriver = new Map<string, DriverVehicle>();
  for (const row of assignments ?? []) {
    const veh = unwrapSingle(row.vehicules);
    if (!row.driver_user_id || !veh?.id || !veh.registration) continue;
    vehicleByDriver.set(row.driver_user_id, {
      id: veh.id,
      registration: veh.registration,
      brand: veh.brand ?? null,
      model: veh.model ?? null,
    });
  }

  const onMission = new Set<string>();
  for (const shift of openShifts ?? []) {
    const embed = unwrapSingle(shift.affectations_vehicules);
    if (embed?.driver_user_id) onMission.add(embed.driver_user_id);
  }

  const licensesByDriver = new Map<
    string,
    { categories: string[]; expiresAt: string | null }
  >();
  for (const license of licenses ?? []) {
    const existing = licensesByDriver.get(license.driver_user_id);
    const categories = existing?.categories ?? [];
    if (
      license.license_category &&
      !categories.includes(license.license_category)
    ) {
      categories.push(license.license_category);
    }

    let expiresAt = existing?.expiresAt ?? null;
    if (license.expires_at) {
      if (!expiresAt || license.expires_at < expiresAt) {
        expiresAt = license.expires_at;
      }
    }

    licensesByDriver.set(license.driver_user_id, {
      categories,
      expiresAt,
    });
  }

  const scoreByDriver = new Map<string, number>();
  for (const row of scores ?? []) {
    const raw = row.score_total ?? row.financial_score;
    if (raw == null) continue;
    // score_total est sur 100 en prod ; affichage snippet sur /10
    scoreByDriver.set(row.driver_user_id, Number(raw) / 10);
  }

  return (adhesions ?? []).map((row) => {
    const profile = unwrapSingle(row.profils);
    const { firstName, lastName } = splitFullName(profile?.full_name ?? null);
    const userId = row.user_id;
    const hasAssignment = vehicleByDriver.has(userId);
    const license = licensesByDriver.get(userId);

    let operationalStatus: DriverOperationalStatus = "available";
    if (onMission.has(userId)) operationalStatus = "on_mission";
    else if (hasAssignment) operationalStatus = "assigned";

    return {
      userId,
      fullName: profile?.full_name ?? null,
      firstName,
      lastName,
      phone: profile?.phone ?? null,
      avatarPath: null,
      createdAt: row.created_at,
      isActive: row.is_active,
      displayStatus: resolveDisplayStatus(
        row.is_active,
        profile?.employment_status,
      ),
      operationalStatus,
      licenseCategories: license?.categories ?? [],
      licenseExpiresAt: license?.expiresAt ?? null,
      safetyScore: scoreByDriver.get(userId) ?? null,
      vehicle: vehicleByDriver.get(userId) ?? null,
    };
  });
}
