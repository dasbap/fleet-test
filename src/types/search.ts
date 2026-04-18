export type VehicleSearchStatus = "active" | "maintenance" | "idle";

export type VehicleSearchMaintenanceType =
  | "queued"
  | "in_progress"
  | "blocked";

export type VehicleSearchAlertSeverity =
  | "critical"
  | "high"
  | "medium"
  | "low";

export interface VehicleSearchFilters {
  query: string;
  status: Set<VehicleSearchStatus>;
  maint: Set<VehicleSearchMaintenanceType>;
  alert: Set<VehicleSearchAlertSeverity>;
  sortBy: "plate" | "km" | "alert" | "similarity";
}

export interface VehicleSearchResult {
  id: string;
  fleet_id: string;
  plate: string;
  brand: string | null;
  model: string | null;
  driver_name: string | null;
  km: number;
  status: VehicleSearchStatus;
  pending_maint_type: VehicleSearchMaintenanceType | null;
  alert_severity: VehicleSearchAlertSeverity | null;
  alert_rank: number;
  search_text: string;
  similarity: number;
}

export interface VehicleSearchPage {
  items: VehicleSearchResult[];
  totalCount: number;
  hasMore: boolean;
  page: number;
  pageSize: number;
}
