import type { SupabaseClient } from "@supabase/supabase-js";
import { differenceInCalendarDays } from "date-fns";
import type { FleetContext } from "@/lib/dashboard/session";
import type { DocumentStatus } from "@/lib/dashboard/fetch-documents";

export interface VehicleFleetInfo {
  id: string;
  name: string;
}

export interface VehicleDriverInfo {
  userId: string;
  fullName: string | null;
  phone: string | null;
}

export interface VehicleDocumentView {
  id: string;
  doc_type: string;
  doc_number: string | null;
  expires_at: string | null;
  issuer: string | null;
  file_path: string | null;
  status: DocumentStatus;
}

export interface VehicleMaintenanceView {
  id: string;
  priority: string;
  status: string;
  notes: string | null;
  planned_at: string | null;
  closed_at: string | null;
  created_at: string;
  isCompleted: boolean;
}

export interface VehicleTripView {
  id: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  distance_km: number | null;
  driverName: string | null;
  displayStatus: "completed" | "in_progress" | "open";
}

export interface VehicleExpenseView {
  id: string;
  category: string;
  amount: number;
  currency: string;
  date: string;
  description: string | null;
}

export interface VehicleDetailData {
  id: string;
  registration: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  current_km: number;
  status: string;
  blocked_reason: string | null;
  fleet: VehicleFleetInfo | null;
  driver: VehicleDriverInfo | null;
  documents: VehicleDocumentView[];
  maintenance: VehicleMaintenanceView[];
  trips: VehicleTripView[];
  expenses: VehicleExpenseView[];
}

function unwrapSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function docStatus(expiresAt: string | null): DocumentStatus {
  if (!expiresAt) return "valid";
  const days = differenceInCalendarDays(new Date(expiresAt), new Date());
  if (days < 0) return "expired";
  if (days <= 30) return "expiring_soon";
  return "valid";
}

function mapTripStatus(
  status: string,
  endedAt: string | null,
): VehicleTripView["displayStatus"] {
  if (status === "open" && !endedAt) return "in_progress";
  if (endedAt || status === "closed") return "completed";
  return "open";
}

export async function fetchVehicleDetail(
  supabase: SupabaseClient,
  context: FleetContext,
  vehicleId: string,
): Promise<VehicleDetailData | null> {
  const { data: vehicle } = await supabase
    .from("vehicules")
    .select(
      "id, registration, brand, model, year, current_km, status, blocked_reason, fleet_id, flottes(id, name)",
    )
    .eq("id", vehicleId)
    .eq("fleet_id", context.fleetId)
    .maybeSingle();

  if (!vehicle) return null;

  const fleetEmbed = unwrapSingle(
    vehicle.flottes as VehicleFleetInfo | VehicleFleetInfo[] | null,
  );

  const [
    assignmentRes,
    vehicleDocsRes,
    maintenanceRes,
    fuelRes,
    assignmentsForTripsRes,
  ] = await Promise.all([
    supabase
      .from("affectations_vehicules")
      .select("driver_user_id, profils(full_name, phone)")
      .eq("vehicle_id", vehicleId)
      .eq("fleet_id", context.fleetId)
      .eq("is_active", true)
      .is("ends_at", null)
      .limit(1)
      .maybeSingle(),

    supabase
      .from("vehicle_documents")
      .select("id, doc_type, doc_number, expires_at, issuer, file_path")
      .eq("vehicle_id", vehicleId)
      .eq("fleet_id", context.fleetId)
      .order("expires_at", { ascending: true }),

    supabase
      .from("travaux_maintenance")
      .select("id, priority, status, notes, planned_at, closed_at, created_at")
      .eq("vehicle_id", vehicleId)
      .eq("fleet_id", context.fleetId)
      .order("created_at", { ascending: false })
      .limit(10),

    supabase
      .from("journal_carburant")
      .select("id, amount_xof, purchased_at, station_name, receipt_ref")
      .eq("vehicle_id", vehicleId)
      .eq("fleet_id", context.fleetId)
      .order("purchased_at", { ascending: false })
      .limit(20),

    supabase
      .from("affectations_vehicules")
      .select("id")
      .eq("vehicle_id", vehicleId)
      .eq("fleet_id", context.fleetId),
  ]);

  const profil = unwrapSingle(
    assignmentRes.data?.profils as
      | { full_name?: string | null; phone?: string | null }
      | { full_name?: string | null; phone?: string | null }[]
      | null,
  );

  const driver: VehicleDriverInfo | null = assignmentRes.data?.driver_user_id
    ? {
        userId: assignmentRes.data.driver_user_id,
        fullName: profil?.full_name ?? null,
        phone: profil?.phone ?? null,
      }
    : null;

  let documents: VehicleDocumentView[] = [];

  if (!vehicleDocsRes.error && vehicleDocsRes.data?.length) {
    documents = vehicleDocsRes.data.map((doc) => ({
      id: doc.id,
      doc_type: doc.doc_type,
      doc_number: doc.doc_number ?? null,
      expires_at: doc.expires_at,
      issuer: doc.issuer ?? null,
      file_path: doc.file_path,
      status: docStatus(doc.expires_at),
    }));
  } else if (driver?.userId) {
    const { data: licenses } = await supabase
      .from("driver_licenses")
      .select("id, license_category, license_number, expires_at, issuing_country, document_url")
      .eq("fleet_id", context.fleetId)
      .eq("driver_user_id", driver.userId)
      .order("expires_at", { ascending: true });

    documents = (licenses ?? []).map((row) => ({
      id: row.id,
      doc_type: "drivers_license",
      doc_number: row.license_number,
      expires_at: row.expires_at,
      issuer: row.issuing_country ?? null,
      file_path: row.document_url,
      status: docStatus(row.expires_at),
    }));
  }

  const assignmentIds = (assignmentsForTripsRes.data ?? []).map((row) => row.id);
  let trips: VehicleTripView[] = [];

  if (assignmentIds.length > 0) {
    const { data: shifts } = await supabase
      .from("creneaux_conducteurs")
      .select(
        "id, started_at, ended_at, status, km_start, km_end, affectations_vehicules(profils!affectations_vehicules_driver_user_id_fkey(full_name))",
      )
      .in("assignment_id", assignmentIds)
      .order("started_at", { ascending: false })
      .limit(20);

    trips = (shifts ?? []).map((shift) => {
      const embed = unwrapSingle(shift.affectations_vehicules);
      const driverProfil = unwrapSingle(
        embed?.profils as
          | { full_name?: string | null }
          | { full_name?: string | null }[]
          | null,
      );
      const distanceKm =
        shift.km_end != null && shift.km_start != null
          ? Math.max(0, shift.km_end - shift.km_start)
          : null;

      return {
        id: shift.id,
        started_at: shift.started_at,
        ended_at: shift.ended_at,
        status: shift.status,
        distance_km: distanceKm,
        driverName: driverProfil?.full_name ?? null,
        displayStatus: mapTripStatus(shift.status, shift.ended_at),
      };
    });
  }

  const maintenance: VehicleMaintenanceView[] = (maintenanceRes.data ?? []).map(
    (row) => ({
      id: row.id,
      priority: row.priority,
      status: row.status,
      notes: row.notes,
      planned_at: row.planned_at,
      closed_at: row.closed_at,
      created_at: row.created_at,
      isCompleted: Boolean(row.closed_at) || row.status === "ready",
    }),
  );

  const expenses: VehicleExpenseView[] = (fuelRes.data ?? []).map((row) => ({
    id: row.id,
    category: "fuel",
    amount: row.amount_xof,
    currency: "XAF",
    date: row.purchased_at,
    description: row.station_name ?? row.receipt_ref ?? null,
  }));

  return {
    id: vehicle.id,
    registration: vehicle.registration,
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year,
    current_km: vehicle.current_km,
    status: vehicle.status,
    blocked_reason: vehicle.blocked_reason,
    fleet: fleetEmbed
      ? { id: fleetEmbed.id, name: fleetEmbed.name }
      : { id: context.fleetId, name: "Flotte" },
    driver,
    documents,
    maintenance,
    trips,
    expenses,
  };
}
