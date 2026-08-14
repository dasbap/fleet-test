import { supabase } from "@/integrations/supabase/client";

export interface SubscriptionVehicle {
  id: string;
  fleetId: string | null;
  registration: string | null;
  status: string | null;
  fleetName: string | null;
  associatedAt: string | null;
}

export interface SubscriptionSummary {
  id: string;
  fleetId: string | null;
  fleetName: string | null;
  planId: string | null;
  planCode: string | null;
  planName: string | null;
  status: string | null;
  startsAt: string | null;
  endsAt: string | null;
  cancelledAt: string | null;
  vehicleSlots: number | null;
  vehicleCapacity: number | null;
  vehicleCount: number;
  availableSlots: number;
  vehicles: SubscriptionVehicle[];
  financeEnabled: boolean;
  aiEnabled: boolean;
  reportsEnabled: boolean;
  driverScoringEnabled: boolean;
  anomalyInsightsEnabled: boolean;
  geofencingEnabled: boolean;
  scheduledReportsEnabled: boolean;
  offlineDriverEnabled: boolean;
}

export class SubscriptionManagementService {
  async listFleetSubscriptions(fleetId: string): Promise<SubscriptionSummary[]> {
    if (!fleetId?.trim()) {
      throw new Error("L'identifiant de la flotte est requis.");
    }

    const { data, error } = await supabase.rpc("list_fleet_subscriptions", {
      p_fleet_id: fleetId,
    });

    if (error) {
      throw new Error(mapSubscriptionError(error.message));
    }

    return normalizeSubscriptionSummaries(data);
  }

  async getSubscriptionDetail(subscriptionId: string): Promise<SubscriptionSummary | null> {
    if (!subscriptionId?.trim()) {
      throw new Error("L'identifiant de l'abonnement est requis.");
    }

    const { data, error } = await supabase.rpc("get_subscription_detail", {
      p_subscription_id: subscriptionId,
    });

    if (error) {
      throw new Error(mapSubscriptionError(error.message));
    }

    return normalizeSubscriptionDetail(data);
  }

  async transferVehicleSubscription(vehicleId: string, targetSubscriptionId: string): Promise<void> {
    if (!vehicleId?.trim() || !targetSubscriptionId?.trim()) {
      throw new Error("Le véhicule et l'abonnement cible sont requis.");
    }

    const { error } = await supabase.rpc("transfer_vehicle_subscription", {
      p_vehicle_id: vehicleId,
      p_target_subscription_id: targetSubscriptionId,
    });

    if (error) {
      throw new Error(mapSubscriptionError(error.message));
    }
  }

  async terminateSubscriptionEarly(subscriptionId: string): Promise<void> {
    if (!subscriptionId?.trim()) {
      throw new Error("L'identifiant de l'abonnement est requis.");
    }

    const { error } = await supabase.rpc("terminate_subscription_early", {
      p_subscription_id: subscriptionId,
    });

    if (error) {
      throw new Error(mapSubscriptionError(error.message));
    }
  }

  async activateSubscription(subscriptionId: string): Promise<void> {
    if (!subscriptionId?.trim()) {
      throw new Error("L'identifiant de l'abonnement est requis.");
    }

    const { error } = await supabase.rpc("activate_fleet_subscription", {
      p_subscription_id: subscriptionId,
    });

    if (error) {
      throw new Error(mapSubscriptionError(error.message));
    }
  }
}

export function normalizeSubscriptionSummaries(raw: unknown): SubscriptionSummary[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map(normalizeSubscriptionRow);
}

export function normalizeSubscriptionDetail(raw: unknown): SubscriptionSummary | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  return normalizeSubscriptionRow(raw as Record<string, unknown>);
}

function normalizeSubscriptionRow(raw: unknown): SubscriptionSummary {
  const row = isRecord(raw) ? raw : {};
  const vehiclesRaw = Array.isArray(row.vehicles) ? row.vehicles : [];
  const vehicleSlots = nullableNum(row.vehicle_slots);

  return {
    id: str(row.id) ?? "",
    fleetId: str(row.fleet_id),
    fleetName: str(row.fleet_name),
    planId: str(row.plan_id),
    planCode: str(row.plan_code),
    planName: str(row.plan_name),
    status: str(row.status),
    startsAt: str(row.starts_at),
    endsAt: str(row.ends_at),
    cancelledAt: str(row.cancelled_at),
    vehicleSlots,
    vehicleCapacity: vehicleSlots ?? nullableNum(row.vehicle_capacity),
    vehicleCount: num(row.vehicle_count),
    availableSlots: num(row.available_slots),
    vehicles: vehiclesRaw.map(normalizeVehicleRow),
    financeEnabled: bool(row.finance_enabled),
    aiEnabled: bool(row.ai_enabled),
    reportsEnabled: bool(row.reports_enabled),
    driverScoringEnabled: bool(row.driver_scoring_enabled),
    anomalyInsightsEnabled: bool(row.anomaly_insights_enabled),
    geofencingEnabled: bool(row.geofencing_enabled),
    scheduledReportsEnabled: bool(row.scheduled_reports_enabled),
    offlineDriverEnabled: bool(row.offline_driver_enabled),
  };
}

function normalizeVehicleRow(raw: unknown): SubscriptionVehicle {
  const row = isRecord(raw) ? raw : {};
  return {
    id: str(row.id) ?? str(row.vehicle_id) ?? "",
    fleetId: str(row.fleet_id),
    registration: str(row.registration),
    status: str(row.status),
    fleetName: str(row.fleet_name),
    associatedAt: str(row.associated_at),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function num(value: unknown): number {
  const valueAsNumber =
    typeof value === "number" ? value : typeof value === "string" ? Number(value) : 0;
  return Number.isFinite(valueAsNumber) ? valueAsNumber : 0;
}

function nullableNum(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  return num(value);
}

function bool(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }
  return false;
}

export function mapSubscriptionError(message: string): string {
  if (
    message.includes("schema cache") &&
    message.includes("list_fleet_subscriptions")
  ) {
    return "Le module Abonnements n'est pas encore activé côté base de données. Appliquez la migration des abonnements puis rechargez le cache PostgREST.";
  }
  if (message.includes("limite_vehicules_abonnements_atteinte")) {
    return "Vous avez atteint la limite de véhicules autorisée par vos abonnements.";
  }
  if (message.includes("limite_vehicules_abonnement_atteinte")) {
    return "Cet abonnement n'a plus d'emplacement véhicule disponible.";
  }
  if (message.includes("abonnement_standard_deja_utilise")) {
    return "Cet abonnement standard est déjà associé à un véhicule.";
  }
  if (message.includes("abonnement_type_incompatible")) {
    return "Ce vÃ©hicule doit rester sur un abonnement du mÃªme type.";
  }
  if (message.includes("abonnement_inactif")) {
    return "Cet abonnement n'est pas actif. Ajoutez un vÃ©hicule ou activez-le depuis la page Abonnements.";
  }
  if (message.includes("abonnement_flotte_incompatible")) {
    return "L'abonnement cible n'appartient pas à la même flotte.";
  }
  if (message.includes("permission_refusee")) {
    return "Vous n'avez pas les droits nécessaires sur cette flotte.";
  }
  return message;
}
