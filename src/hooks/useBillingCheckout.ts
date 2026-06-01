/**
 * Machine à états du checkout Notch Pay.
 *
 * États :
 *   idle → initiating (appel BFF) → redirecting (redirection URL) → failed
 *
 * L'abonnement n'est jamais activé ici. L'activation se fait exclusivement
 * via le webhook Notch Pay confirmé côté serveur.
 */

import { useCallback, useState } from "react";
import { getBffBaseUrl, isBffConfigured } from "@/lib/bff-config";
import { useAuthOptional } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import type { NotchPayInitiateResult } from "@/hooks/useNotchPayPayment";

// ─── Types ──────────────────────────────────────────────────────────────────

export type CheckoutState =
  | { status: "idle" }
  | { status: "initiating" }
  | { status: "redirecting"; reference: string; amountXaf: number }
  | { status: "failed"; error: string };

export interface BillingCheckoutOptions {
  planCode: string;
  planName: string;
  vehicleCount: number;
  durationMonths: number;
  addOns?: {
    pulse?: boolean;
    qrPremium?: boolean;
  };
  vehicleIds?: string[];
  phone?: string;
  email?: string;
}

export interface UseBillingCheckoutReturn {
  state: CheckoutState;
  isIdle: boolean;
  isLoading: boolean;
  /** Lance le paiement et gère tous les états. */
  initiate: (opts: BillingCheckoutOptions) => Promise<void>;
  /** Remet l'état à idle (ex: après erreur). */
  reset: () => void;
  bffAvailable: boolean;
}

// ─── Service initiateNotchPayCheckout ─────────────────────────────────────

export interface NotchPayCheckoutRequest {
  orgId: string;
  fleetId: string;
  planCode: string;
  vehicleCount: number;
  durationMonths: number;
  addOns?: { pulse?: boolean; qrPremium?: boolean };
  vehicleIds?: string[];
  phone?: string;
  email?: string;
  accessToken: string;
}

/**
 * Service de bas niveau — appelle le BFF et retourne le résultat Notch Pay.
 * Séparé du hook pour pouvoir être testé indépendamment.
 */
export async function initiateNotchPayCheckout(
  req: NotchPayCheckoutRequest,
): Promise<NotchPayInitiateResult> {
  const bff = getBffBaseUrl() ?? "";
  const { accessToken, ...body } = req;

  const res = await fetch(`${bff}/billing/notch/initiate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = `Erreur serveur (${res.status})`;
    try {
      const json = JSON.parse(text) as { error?: string };
      if (json.error) message = json.error;
    } catch {
      if (text) message = text;
    }
    throw new Error(message);
  }

  return (await res.json()) as NotchPayInitiateResult;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useBillingCheckout(): UseBillingCheckoutReturn {
  const [state, setState] = useState<CheckoutState>({ status: "idle" });
  const auth = useAuthOptional();
  const orgId = auth?.orgId;
  const activeTenantContext = auth?.activeTenantContext;
  const session = auth?.session;
  const bffAvailable = isBffConfigured();

  const reset = useCallback(() => setState({ status: "idle" }), []);

  const initiate = useCallback(
    async (opts: BillingCheckoutOptions) => {
      if (!bffAvailable) {
        setState({ status: "failed", error: "Le paiement en ligne n'est pas disponible dans cette configuration." });
        return;
      }
      if (!auth) {
        setState({
          status: "failed",
          error: "Connectez-vous pour finaliser votre abonnement.",
        });
        return;
      }
      if (!orgId) {
        setState({ status: "failed", error: "Organisation introuvable." });
        return;
      }
      const fleetId = activeTenantContext?.fleetId;
      if (!fleetId) {
        setState({ status: "failed", error: "Flotte introuvable." });
        return;
      }
      if (!session?.access_token) {
        setState({ status: "failed", error: "Session expirée — reconnectez-vous." });
        return;
      }

      setState({ status: "initiating" });

      try {
        const result = await initiateNotchPayCheckout({
          orgId,
          fleetId,
          planCode: opts.planCode,
          vehicleCount: opts.vehicleCount,
          durationMonths: opts.durationMonths,
          addOns: opts.addOns,
          vehicleIds: opts.vehicleIds,
          phone: opts.phone,
          email: opts.email,
          accessToken: session.access_token,
        });

        setState({
          status: "redirecting",
          reference: result.reference,
          amountXaf: result.amountXaf,
        });

        toast({
          title: "Redirection vers Notch Pay…",
          description: `${result.amountXaf.toLocaleString("fr-FR")} FCFA — réf. ${result.reference}`,
        });

        // Délai léger pour que le toast soit visible
        setTimeout(() => {
          window.location.href = result.checkoutUrl;
        }, 800);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur inattendue";
        setState({ status: "failed", error: message });
        toast({ title: "Erreur paiement", description: message, variant: "destructive" });
      }
    },
    [auth, bffAvailable, orgId, activeTenantContext, session],
  );

  return {
    state,
    isIdle:    state.status === "idle",
    isLoading: state.status === "initiating" || state.status === "redirecting",
    initiate,
    reset,
    bffAvailable,
  };
}
