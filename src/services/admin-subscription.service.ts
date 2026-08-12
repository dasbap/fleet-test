import { supabase } from "@/integrations/supabase/client";

export interface AdminSubscriptionFleetOption {
  id: string;
  name: string;
  orgName: string | null;
}

export interface AdminSubscriptionPlanOption {
  code: string;
  name: string;
  maxVehicles: number | null;
}

export interface AdminSubscriptionGrantOptions {
  fleets: AdminSubscriptionFleetOption[];
  plans: AdminSubscriptionPlanOption[];
}

export interface AdminSubscriptionGrantInput {
  fleetId: string;
  planCode: string;
  expiresAt: string | null;
  permanent: boolean;
  replaceExisting: boolean;
  vehicleSlots: number;
  planMaxVehicles?: number | null;
}

export class AdminSubscriptionService {
  async listGrantOptions(): Promise<AdminSubscriptionGrantOptions> {
    const { data, error } = await supabase.rpc("admin_list_subscription_grant_options");

    if (error) {
      throw new Error(mapAdminSubscriptionError(error.message));
    }

    return normalizeSubscriptionGrantOptions(data);
  }

  async grantSubscription(input: AdminSubscriptionGrantInput): Promise<void> {
    if (!input.fleetId || !input.planCode) {
      throw new Error("La flotte et le plan sont requis.");
    }
    if (!input.permanent && !input.expiresAt) {
      throw new Error("Choisissez une date d'expiration ou activez la permanence.");
    }
    if (!Number.isInteger(input.vehicleSlots) || input.vehicleSlots <= 0) {
      throw new Error("Choisissez un nombre de vehicules superieur a 0.");
    }
    if (input.planMaxVehicles != null && input.vehicleSlots > input.planMaxVehicles) {
      throw new Error(
        `Le plan ${formatPlanName(input.planCode)} autorise jusqu'a ${input.planMaxVehicles} vehicules.`,
      );
    }

    const { error } = await supabase.rpc("admin_create_fleet_subscription", {
      p_fleet_id: input.fleetId,
      p_plan_code: input.planCode,
      p_expires_at: input.permanent ? null : input.expiresAt,
      p_permanent: input.permanent,
      p_replace_existing: input.replaceExisting,
      p_vehicle_slots: input.vehicleSlots,
      p_status: "active",
    });

    if (error) {
      throw new Error(mapAdminSubscriptionError(error.message));
    }
  }
}

export function normalizeSubscriptionGrantOptions(raw: unknown): AdminSubscriptionGrantOptions {
  const root = isRecord(raw) ? raw : {};
  const fleetsRaw = Array.isArray(root.fleets) ? root.fleets : [];
  const plansRaw = Array.isArray(root.plans) ? root.plans : [];

  return {
    fleets: fleetsRaw.map((item) => {
      const row = isRecord(item) ? item : {};
      return {
        id: str(row.id),
        name: str(row.name) || "Flotte sans nom",
        orgName: str(row.org_name),
      };
    }).filter((fleet) => fleet.id),
    plans: plansRaw.map((item) => {
      const row = isRecord(item) ? item : {};
      return {
        code: str(row.code),
        name: str(row.name) || str(row.code),
        maxVehicles: nullableNum(row.max_vehicles),
      };
    }).filter((plan) => plan.code),
  };
}

function mapAdminSubscriptionError(message: string): string {
  if (message.includes("permission_refusee_super_admin_abonnement")) {
    return "Seul le super admin peut attribuer un abonnement.";
  }
  if (message.includes("expires_at_required")) {
    return "Choisissez une date d'expiration ou activez la permanence.";
  }
  if (message.includes("expires_at_must_be_future")) {
    return "La date d'expiration doit être dans le futur.";
  }
  if (message.includes("vehicle_slots_must_be_positive")) {
    return "Choisissez un nombre de vehicules superieur a 0.";
  }
  if (message.includes("limite_vehicules_plan_flotte_atteinte")) {
    return "Ce nombre de vehicules depasse le plafond autorise pour ce plan.";
  }
  if (message.includes("fleet_not_found")) {
    return "Flotte introuvable.";
  }
  if (message.includes("plan_not_found")) {
    return "Plan introuvable.";
  }
  return message;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function nullableNum(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatPlanName(planCode: string): string {
  const normalized = planCode.trim().toLowerCase();
  if (normalized === "starter") return "Starter";
  if (normalized === "pro") return "Pro";
  if (normalized === "enterprise") return "Enterprise";
  return planCode || "selectionne";
}
