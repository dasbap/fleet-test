import type { SupabaseClient } from "@supabase/supabase-js";
import { differenceInCalendarDays, subDays } from "date-fns";
import type { FleetContext } from "@/lib/dashboard/session";

export interface RapportKpis {
  fleetName: string;
  periodStart: string;
  periodEnd: string;
  vehicleCount: number;
  vehiclesActive: number;
  vehiclesBlocked: number;
  driverCount: number;
  totalKm: number;
  shiftCount: number;
  incidentCount: number;
  maintenanceOpen: number;
  maintenanceClosed: number;
  fuelTotalXaf: number;
  fuelEntries: number;
  avgDriverScore: number | null;
}

export interface RapportIncidentRow {
  id: string;
  description: string;
  severity: string;
  created_at: string;
  vehicleRegistration: string | null;
}

export interface RapportVehicleStat {
  vehicle_id: string;
  plate_number: string;
  brand: string | null;
  model: string | null;
  status: string;
  current_mileage: number | null;
  total_trips: number;
  total_km: number;
  total_expenses: number;
  expired_docs: number;
  expiring_docs: number;
  total_incidents: number;
}

export interface RapportDriverPerformance {
  driver_id: string;
  driver_name: string;
  status: string;
  total_trips: number;
  total_km: number;
  safety_score: number | null;
  total_incidents: number;
  last_trip_at: string | null;
}

export interface RapportMonthlyExpense {
  month: string;
  category: string;
  nb_records: number;
  total_amount: number;
  avg_amount: number;
}

export interface RapportIncidentDetail {
  id: string;
  type: string;
  severity: string;
  status: string;
  occurred_at: string;
}

export interface RapportsPageData {
  fleetName: string;
  userRole: string;
  kpis: RapportKpis;
  recentIncidents: RapportIncidentRow[];
  vehicleStats: RapportVehicleStat[];
  driverPerformance: RapportDriverPerformance[];
  monthlyExpenses: RapportMonthlyExpense[];
  incidents: RapportIncidentDetail[];
}

interface ShiftRow {
  assignment_id: string;
  km_start: number;
  km_end: number | null;
  ended_at: string | null;
  started_at: string;
}

interface AssignmentRow {
  id: string;
  vehicle_id: string;
  driver_user_id: string;
}

function unwrapSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function shiftKm(shift: ShiftRow): number {
  if (shift.km_end == null) return 0;
  return Math.max(0, shift.km_end - shift.km_start);
}

function buildMonthlyExpenses(
  fuelRows: { purchased_at: string; amount_xof: number }[],
): RapportMonthlyExpense[] {
  const groups = new Map<string, { count: number; total: number }>();

  for (const row of fuelRows) {
    const monthKey = row.purchased_at.slice(0, 7);
    const key = `${monthKey}|fuel`;
    const existing = groups.get(key) ?? { count: 0, total: 0 };
    existing.count += 1;
    existing.total += Number(row.amount_xof ?? 0);
    groups.set(key, existing);
  }

  return Array.from(groups.entries())
    .map(([key, val]) => {
      const [month, category] = key.split("|");
      return {
        month: `${month}-01`,
        category: category ?? "fuel",
        nb_records: val.count,
        total_amount: val.total,
        avg_amount: val.count > 0 ? val.total / val.count : 0,
      };
    })
    .sort((a, b) => b.month.localeCompare(a.month));
}

function mapIncidentType(category: string | null, description: string): string {
  if (category?.trim()) return category;
  const lower = description.toLowerCase();
  if (lower.includes("accident")) return "accident";
  if (lower.includes("panne") || lower.includes("breakdown")) return "breakdown";
  if (lower.includes("vol") || lower.includes("theft")) return "theft";
  return "other";
}

export function defaultReportPeriod(days = 30) {
  const end = new Date();
  const start = subDays(end, days);
  return {
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    days,
  };
}

async function fetchShiftsForPeriod(
  supabase: SupabaseClient,
  fleetId: string,
  assignmentIds: string[],
  startISO: string,
  endISO: string,
): Promise<ShiftRow[]> {
  const primary = await supabase
    .from("creneaux_conducteurs")
    .select("assignment_id, km_start, km_end, ended_at, started_at")
    .eq("fleet_id", fleetId)
    .eq("status", "closed")
    .gte("ended_at", startISO)
    .lte("ended_at", endISO);

  if (!primary.error && primary.data) {
    return primary.data as ShiftRow[];
  }

  if (assignmentIds.length === 0) return [];

  const fallback = await supabase
    .from("creneaux_conducteurs")
    .select("assignment_id, km_start, km_end, ended_at, started_at")
    .eq("status", "closed")
    .in("assignment_id", assignmentIds)
    .gte("ended_at", startISO)
    .lte("ended_at", endISO);

  return (fallback.data ?? []) as ShiftRow[];
}

export async function fetchRapportsPageData(
  supabase: SupabaseClient,
  context: FleetContext,
  startISO: string,
  endISO: string,
): Promise<RapportsPageData> {
  const [
    { data: fleet },
    { data: vehicles },
    { data: drivers },
    { data: assignments },
    { data: maintenance },
    { data: fuel },
    { data: scores },
    { data: vehicleDocs },
  ] = await Promise.all([
    supabase.from("flottes").select("name").eq("id", context.fleetId).maybeSingle(),
    supabase
      .from("vehicules")
      .select("id, registration, brand, model, status, current_km")
      .eq("fleet_id", context.fleetId),
    supabase
      .from("flotte_adhesions")
      .select("user_id, is_active, profils(full_name)")
      .eq("fleet_id", context.fleetId)
      .eq("role", "driver"),
    supabase
      .from("affectations_vehicules")
      .select("id, vehicle_id, driver_user_id")
      .eq("fleet_id", context.fleetId),
    supabase
      .from("travaux_maintenance")
      .select("id, closed_at, created_at")
      .eq("fleet_id", context.fleetId)
      .gte("created_at", startISO)
      .lte("created_at", endISO),
    supabase
      .from("journal_carburant")
      .select("vehicle_id, amount_xof, purchased_at")
      .eq("fleet_id", context.fleetId)
      .gte("purchased_at", startISO)
      .lte("purchased_at", endISO),
    supabase
      .from("scores_conducteurs")
      .select("driver_user_id, score_total, financial_score")
      .eq("fleet_id", context.fleetId),
    supabase
      .from("vehicle_documents")
      .select("vehicle_id, expires_at")
      .eq("fleet_id", context.fleetId)
      .not("expires_at", "is", null),
  ]);

  const vehicleIds = (vehicles ?? []).map((v) => v.id);
  const assignmentRows = (assignments ?? []) as AssignmentRow[];
  const assignmentIds = assignmentRows.map((a) => a.id);

  const assignmentMeta = new Map<
    string,
    { vehicleId: string; driverUserId: string }
  >();
  for (const row of assignmentRows) {
    assignmentMeta.set(row.id, {
      vehicleId: row.vehicle_id,
      driverUserId: row.driver_user_id,
    });
  }

  const shifts = await fetchShiftsForPeriod(
    supabase,
    context.fleetId,
    assignmentIds,
    startISO,
    endISO,
  );

  let incidentCount = 0;
  let recentIncidents: RapportIncidentRow[] = [];
  let incidents: RapportIncidentDetail[] = [];

  if (vehicleIds.length > 0) {
    const [{ count }, { data: incidentRows }] = await Promise.all([
      supabase
        .from("incidents")
        .select("id", { count: "exact", head: true })
        .in("vehicle_id", vehicleIds)
        .gte("created_at", startISO)
        .lte("created_at", endISO),
      supabase
        .from("incidents")
        .select(
          "id, description, severity, status, incident_category, created_at, vehicules(registration)",
        )
        .in("vehicle_id", vehicleIds)
        .gte("created_at", startISO)
        .lte("created_at", endISO)
        .order("created_at", { ascending: false }),
    ]);

    incidentCount = count ?? 0;

    recentIncidents = (incidentRows ?? []).slice(0, 10).map((row) => {
      const veh = unwrapSingle(row.vehicules as { registration?: string } | null);
      return {
        id: row.id,
        description: row.description,
        severity: row.severity,
        created_at: row.created_at,
        vehicleRegistration: veh?.registration ?? null,
      };
    });

    incidents = (incidentRows ?? []).map((row) => ({
      id: row.id,
      type: mapIncidentType(row.incident_category, row.description),
      severity: row.severity,
      status: row.status ?? "open",
      occurred_at: row.created_at,
    }));
  }

  const fuelRows = fuel ?? [];
  const fuelTotalXaf = fuelRows.reduce(
    (sum, row) => sum + (row.amount_xof ?? 0),
    0,
  );

  const scoreByDriver = new Map<string, number>();
  for (const row of scores ?? []) {
    const raw = row.score_total ?? row.financial_score;
    if (raw != null) {
      scoreByDriver.set(row.driver_user_id, Number(raw) / 10);
    }
  }

  const scoreValues = [...scoreByDriver.values()];
  const avgDriverScore =
    scoreValues.length > 0
      ? scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length
      : null;

  const maintenanceRows = maintenance ?? [];
  const vehiclesActive = (vehicles ?? []).filter((v) => v.status === "ok").length;
  const vehiclesBlocked = (vehicles ?? []).filter(
    (v) => v.status === "blocked",
  ).length;

  const totalKm = shifts.reduce((sum, s) => sum + shiftKm(s), 0);
  const shiftCount = shifts.length;

  const expensesByVehicle = new Map<string, number>();
  for (const row of fuelRows) {
    expensesByVehicle.set(
      row.vehicle_id,
      (expensesByVehicle.get(row.vehicle_id) ?? 0) + Number(row.amount_xof ?? 0),
    );
  }

  const tripsByVehicle = new Map<string, number>();
  const kmByVehicle = new Map<string, number>();
  const tripsByDriver = new Map<string, number>();
  const kmByDriver = new Map<string, number>();
  const lastTripByDriver = new Map<string, string>();

  for (const shift of shifts) {
    const meta = assignmentMeta.get(shift.assignment_id);
    if (!meta) continue;

    const km = shiftKm(shift);
    tripsByVehicle.set(
      meta.vehicleId,
      (tripsByVehicle.get(meta.vehicleId) ?? 0) + 1,
    );
    kmByVehicle.set(meta.vehicleId, (kmByVehicle.get(meta.vehicleId) ?? 0) + km);

    tripsByDriver.set(
      meta.driverUserId,
      (tripsByDriver.get(meta.driverUserId) ?? 0) + 1,
    );
    kmByDriver.set(
      meta.driverUserId,
      (kmByDriver.get(meta.driverUserId) ?? 0) + km,
    );

    const ended = shift.ended_at ?? shift.started_at;
    const prev = lastTripByDriver.get(meta.driverUserId);
    if (!prev || ended > prev) {
      lastTripByDriver.set(meta.driverUserId, ended);
    }
  }

  const incidentsByVehicle = new Map<string, number>();
  const incidentsByDriver = new Map<string, number>();

  if (vehicleIds.length > 0) {
    const { data: incidentAgg } = await supabase
      .from("incidents")
      .select("vehicle_id, driver_user_id")
      .in("vehicle_id", vehicleIds)
      .gte("created_at", startISO)
      .lte("created_at", endISO);

    for (const row of incidentAgg ?? []) {
      incidentsByVehicle.set(
        row.vehicle_id,
        (incidentsByVehicle.get(row.vehicle_id) ?? 0) + 1,
      );
      if (row.driver_user_id) {
        incidentsByDriver.set(
          row.driver_user_id,
          (incidentsByDriver.get(row.driver_user_id) ?? 0) + 1,
        );
      }
    }
  }

  const today = new Date();
  const expiredByVehicle = new Map<string, number>();
  const expiringByVehicle = new Map<string, number>();

  if (!vehicleDocs?.length) {
    // Pas de table vehicle_documents — pas de comptage par véhicule
  } else {
    for (const doc of vehicleDocs) {
      const days = differenceInCalendarDays(new Date(doc.expires_at), today);
      if (days < 0) {
        expiredByVehicle.set(
          doc.vehicle_id,
          (expiredByVehicle.get(doc.vehicle_id) ?? 0) + 1,
        );
      } else if (days <= 30) {
        expiringByVehicle.set(
          doc.vehicle_id,
          (expiringByVehicle.get(doc.vehicle_id) ?? 0) + 1,
        );
      }
    }
  }

  const vehicleStats: RapportVehicleStat[] = (vehicles ?? []).map((v) => ({
    vehicle_id: v.id,
    plate_number: v.registration,
    brand: v.brand,
    model: v.model,
    status: v.status === "ok" ? "active" : v.status,
    current_mileage: v.current_km,
    total_trips: tripsByVehicle.get(v.id) ?? 0,
    total_km: kmByVehicle.get(v.id) ?? 0,
    total_expenses: expensesByVehicle.get(v.id) ?? 0,
    expired_docs: expiredByVehicle.get(v.id) ?? 0,
    expiring_docs: expiringByVehicle.get(v.id) ?? 0,
    total_incidents: incidentsByVehicle.get(v.id) ?? 0,
  }));

  const driverPerformance: RapportDriverPerformance[] = (drivers ?? []).map(
    (row) => {
      const profil = unwrapSingle(
        row.profils as { full_name?: string | null } | null,
      );
      return {
        driver_id: row.user_id,
        driver_name: profil?.full_name?.trim() || "Conducteur",
        status: row.is_active ? "active" : "inactive",
        total_trips: tripsByDriver.get(row.user_id) ?? 0,
        total_km: kmByDriver.get(row.user_id) ?? 0,
        safety_score: scoreByDriver.get(row.user_id) ?? null,
        total_incidents: incidentsByDriver.get(row.user_id) ?? 0,
        last_trip_at: lastTripByDriver.get(row.user_id) ?? null,
      };
    },
  );

  const fleetName = fleet?.name ?? "Flotte";

  return {
    fleetName,
    userRole: context.role,
    kpis: {
      fleetName,
      periodStart: startISO,
      periodEnd: endISO,
      vehicleCount: vehicles?.length ?? 0,
      vehiclesActive,
      vehiclesBlocked,
      driverCount: (drivers ?? []).filter((d) => d.is_active).length,
      totalKm,
      shiftCount,
      incidentCount,
      maintenanceOpen: maintenanceRows.filter((m) => !m.closed_at).length,
      maintenanceClosed: maintenanceRows.filter((m) => m.closed_at).length,
      fuelTotalXaf,
      fuelEntries: fuelRows.length,
      avgDriverScore,
    },
    recentIncidents,
    vehicleStats,
    driverPerformance,
    monthlyExpenses: buildMonthlyExpenses(fuelRows),
    incidents,
  };
}
