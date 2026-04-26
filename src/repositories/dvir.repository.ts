import { supabase } from "@/integrations/supabase/client";

export type DvirInspectionType = "pre_trip" | "post_trip" | "weekly" | "periodic" | "interim";
export type DvirStatus = "ok" | "minor_issues" | "defects_noted" | "unsafe";
export type DvirItemStatus = "ok" | "defaut" | "defect" | "na";

export interface DvirListItem {
  id: string;
  fleet_id: string;
  vehicle_id: string;
  vehicle_registration: string | null;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  inspected_by: string;
  inspector_name: string | null;
  inspection_type: DvirInspectionType;
  overall_status: DvirStatus;
  odometer_km: number | null;
  defects_count: number;
  notes: string | null;
  inspected_at: string;
  created_at: string;
}

export interface DvirChecklistConfigItem {
  order: number;
  slug: string;
  label: string;
  severity: "critical" | "standard" | "info";
  description: string;
  db_key: string;
}

export interface DvirListFilters {
  fleetId: string;
  vehicleId?: string;
  inspectedBy?: string;
  status?: DvirStatus;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface DvirInsertInput {
  fleet_id: string;
  vehicle_id: string;
  inspected_by: string;
  inspection_type: DvirInspectionType;
  items: Record<string, { status: DvirItemStatus; note?: string }>;
  overall_status: DvirStatus;
  notes?: string | null;
  odometer_km?: number | null;
}

export class DvirRepository {
  async getList(filters: DvirListFilters): Promise<DvirListItem[]> {
    const { data, error } = await supabase.rpc("get_dvir_list", {
      p_fleet_id: filters.fleetId,
      p_vehicle_id: filters.vehicleId ?? null,
      p_inspected_by: filters.inspectedBy ?? null,
      p_status: filters.status ?? null,
      p_date_from: filters.dateFrom ?? null,
      p_date_to: filters.dateTo ?? null,
      p_limit: filters.limit ?? 50,
      p_offset: filters.offset ?? 0,
    });

    if (error) {
      console.error("Erreur get_dvir_list:", error);
      throw new Error(error.message);
    }

    return (data ?? []) as DvirListItem[];
  }

  async getChecklistConfig(): Promise<DvirChecklistConfigItem[]> {
    const { data, error } = await supabase.rpc("get_dvir_checklist_config");

    if (error) {
      console.error("Erreur get_dvir_checklist_config:", error);
      throw new Error(error.message);
    }

    if (!Array.isArray(data)) {
      return [];
    }

    return data as DvirChecklistConfigItem[];
  }

  async create(input: DvirInsertInput): Promise<void> {
    const { error } = await supabase.from("controles_journaliers").insert(input);
    if (error) {
      console.error("Erreur create controles_journaliers:", error);
      throw new Error(error.message);
    }
  }

  async getById(id: string): Promise<DvirListItem | null> {
    const { data, error } = await supabase
      .from("controles_journaliers")
      .select(
        `
          id,
          fleet_id,
          vehicle_id,
          inspected_by,
          inspection_type,
          overall_status,
          odometer_km,
          notes,
          inspected_at,
          created_at,
          vehicle:vehicules!controles_journaliers_vehicle_id_fkey(registration, brand, model),
          inspector:profils!controles_journaliers_inspected_by_fkey(full_name)
        `,
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Erreur getById controles_journaliers:", error);
      throw new Error(error.message);
    }

    if (!data) {
      return null;
    }

    const vehicle = data.vehicle as { registration: string | null; brand: string | null; model: string | null } | null;
    const inspector = data.inspector as { full_name: string | null } | null;

    return {
      id: data.id,
      fleet_id: data.fleet_id,
      vehicle_id: data.vehicle_id,
      vehicle_registration: vehicle?.registration ?? null,
      vehicle_brand: vehicle?.brand ?? null,
      vehicle_model: vehicle?.model ?? null,
      inspected_by: data.inspected_by,
      inspector_name: inspector?.full_name ?? null,
      inspection_type: data.inspection_type as DvirInspectionType,
      overall_status: data.overall_status as DvirStatus,
      odometer_km: data.odometer_km,
      defects_count: 0,
      notes: data.notes,
      inspected_at: data.inspected_at,
      created_at: data.created_at,
    };
  }
}
