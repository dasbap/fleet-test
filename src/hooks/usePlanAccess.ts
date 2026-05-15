/**
 * Hook React — accès plan en lecture seule.
 * Enroule FleetBillingContext + planGuards pour une consommation simple dans les composants.
 * Ne prend jamais de décisions d'activation : uniquement de l'affichage.
 */

import { useFleetBillingContext } from "@/hooks/useFleetBillingContext";
import {
  getAllPlanAccess,
  canCreateVehicle,
  canUsePulse,
  canUseQrPremium,
  canExportReports,
  canUseFinance,
  canAccessMultiFleet,
  canUseDriverScoring,
  type PlanAccessSummary,
  type PlanAccessResult,
} from "@/lib/billing/planGuards";
import type { FleetBillingContext } from "@/types/billing-production";

export interface UsePlanAccessReturn {
  isLoading: boolean;
  /** Droits agrégés — undefined si contexte pas encore chargé. */
  access: PlanAccessSummary | undefined;
  // Raccourcis booléens
  canCreateVehicle: boolean;
  canUsePulse: boolean;
  canUseQrPremium: boolean;
  canExportReports: boolean;
  canUseFinance: boolean;
  canAccessMultiFleet: boolean;
  canUseDriverScoring: boolean;
  // Résultats complets (avec messages upgrade)
  createVehicleAccess: PlanAccessResult | undefined;
  pulseAccess: PlanAccessResult | undefined;
  qrPremiumAccess: PlanAccessResult | undefined;
  exportReportsAccess: PlanAccessResult | undefined;
  financeAccess: PlanAccessResult | undefined;
  multiFleetAccess: PlanAccessResult | undefined;
  /** Contexte brut — utile pour passer à PaywallOverlay. */
  billingCtx: FleetBillingContext | undefined;
}

export function usePlanAccess(fleetId?: string): UsePlanAccessReturn {
  const { data: ctx, isLoading } = useFleetBillingContext(fleetId);

  if (!ctx || isLoading) {
    return {
      isLoading: true,
      access: undefined,
      canCreateVehicle:   false,
      canUsePulse:        false,
      canUseQrPremium:    false,
      canExportReports:   false,
      canUseFinance:      false,
      canAccessMultiFleet: false,
      canUseDriverScoring: false,
      createVehicleAccess: undefined,
      pulseAccess:         undefined,
      qrPremiumAccess:     undefined,
      exportReportsAccess: undefined,
      financeAccess:       undefined,
      multiFleetAccess:    undefined,
      billingCtx:          undefined,
    };
  }

  const access = getAllPlanAccess(ctx);

  return {
    isLoading: false,
    access,
    canCreateVehicle:    access.createVehicle.allowed,
    canUsePulse:         access.pulse.allowed,
    canUseQrPremium:     access.qrPremium.allowed,
    canExportReports:    access.exportReports.allowed,
    canUseFinance:       access.finance.allowed,
    canAccessMultiFleet: access.multiFleet.allowed,
    canUseDriverScoring: access.driverScoring.allowed,
    createVehicleAccess: access.createVehicle,
    pulseAccess:         access.pulse,
    qrPremiumAccess:     access.qrPremium,
    exportReportsAccess: access.exportReports,
    financeAccess:       access.finance,
    multiFleetAccess:    access.multiFleet,
    billingCtx:          ctx,
  };
}

// ─── Guards isolés (hooks atomiques) ──────────────────────────────────────

/** Retourne uniquement le droit de créer un véhicule. */
export function useCanCreateVehicle(fleetId?: string): PlanAccessResult & { isLoading: boolean } {
  const { data: ctx, isLoading } = useFleetBillingContext(fleetId);
  if (!ctx) return { isLoading, allowed: false };
  return { isLoading, ...canCreateVehicle(ctx) };
}

export function useCanUsePulse(fleetId?: string): PlanAccessResult & { isLoading: boolean } {
  const { data: ctx, isLoading } = useFleetBillingContext(fleetId);
  if (!ctx) return { isLoading, allowed: false };
  return { isLoading, ...canUsePulse(ctx) };
}

export function useCanUseQrPremium(fleetId?: string): PlanAccessResult & { isLoading: boolean } {
  const { data: ctx, isLoading } = useFleetBillingContext(fleetId);
  if (!ctx) return { isLoading, allowed: false };
  return { isLoading, ...canUseQrPremium(ctx) };
}

export function useCanExportReports(fleetId?: string): PlanAccessResult & { isLoading: boolean } {
  const { data: ctx, isLoading } = useFleetBillingContext(fleetId);
  if (!ctx) return { isLoading, allowed: false };
  return { isLoading, ...canExportReports(ctx) };
}

export function useCanUseFinance(fleetId?: string): PlanAccessResult & { isLoading: boolean } {
  const { data: ctx, isLoading } = useFleetBillingContext(fleetId);
  if (!ctx) return { isLoading, allowed: false };
  return { isLoading, ...canUseFinance(ctx) };
}
