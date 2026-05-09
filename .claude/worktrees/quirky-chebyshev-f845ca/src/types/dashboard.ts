export type AlertSeverity = "info" | "warning" | "critical";
export type AlertType =
  | "oil"
  | "brakes"
  | "tires"
  | "revision"
  | "ct"
  | "custom";
export type ActionKind = "schedule" | "immobilize" | "book" | "order" | "plan";

export interface DashboardAlert {
  id: string;
  vehicleId: string;
  plate: string;
  vehicleName: string;
  severity: AlertSeverity;
  type: AlertType;
  message: string;
  createdAt: string;
  resolvedAt: string | null;
  action: {
    kind: ActionKind;
    label: string;
    payload: Record<string, unknown>;
  };
}

export interface KpiSummary {
  activeVehicles: number;
  inMaintenance: number;
  criticalAlerts: number;
  overdueServices: number;
  deltaCritical: number;
  deltaActive: number;
}
