/**
 * Hook — État du compte E-Samba.
 *
 * Charge depuis Supabase :
 *   - abonnement courant + plan
 *   - métriques flotte (véhicules, chauffeurs)
 *
 * Usage :
 *   const { subscription, fleet, isHealthy, requiresAction } = useAccountStatus();
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { AccountStatus, AccountSubscription, FleetMetrics, AccountPlan } from '@/types/account-status';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysBetween(from: string | null, to: string | null): number | null {
  if (!from || !to) return null;
  const diff = new Date(to).getTime() - new Date(from).getTime();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

function buildActionMessage(sub: AccountSubscription | null): string | null {
  if (!sub) return null;

  switch (sub.status) {
    case 'pending_payment':
      return 'Un paiement est en attente. Mettez à jour votre moyen de paiement pour éviter l\'interruption de service.';
    case 'grace_period': {
      const days = daysBetween(new Date().toISOString(), sub.grace_ends_at);
      return `Votre paiement est en retard. Vous avez encore ${days ?? 0} jour(s) avant la suspension de votre flotte.`;
    }
    case 'suspended':
      return 'Votre flotte est suspendue. Réglez votre facture impayée pour rétablir l\'accès.';
    case 'expired':
      return 'Votre abonnement a expiré. Renouvelez votre abonnement pour accéder à votre flotte.';
    case 'trialing': {
      const days = daysBetween(new Date().toISOString(), sub.trial_ends_at);
      if (days !== null && days <= 2) {
        return `Votre essai gratuit se termine dans ${days} jour(s). Choisissez un abonnement pour continuer.`;
      }
      return null;
    }
    default:
      return null;
  }
}

// ─── Fetch Supabase ───────────────────────────────────────────────────────────

async function fetchAccountStatus(): Promise<{
  subscription: AccountSubscription | null;
  fleet: FleetMetrics | null;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { subscription: null, fleet: null };

  // Récupérer l'abonnement courant via la flotte de l'utilisateur
  const { data: adhesion } = await supabase
    .from('flotte_adhesions')
    .select('fleet_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (!adhesion?.fleet_id) return { subscription: null, fleet: null };

  const fleetId = adhesion.fleet_id;

  // Abonnement courant
  const { data: sub } = await supabase
    .from('abonnements')
    .select(`
      id, statut, period_start, period_end,
      trial_ends_at, grace_ends_at,
      next_amount, payment_method, last_payment_at, next_billing_at,
      plans (
        id, name, max_vehicles,
        features
      )
    `)
    .eq('fleet_id', fleetId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Métriques flotte
  const { count: totalVehicles } = await supabase
    .from('vehicules')
    .select('*', { count: 'exact', head: true })
    .eq('fleet_id', fleetId);

  const { count: activeVehicles } = await supabase
    .from('vehicules')
    .select('*', { count: 'exact', head: true })
    .eq('fleet_id', fleetId)
    .eq('statut', 'actif');

  const { count: totalDrivers } = await supabase
    .from('flotte_adhesions')
    .select('*', { count: 'exact', head: true })
    .eq('fleet_id', fleetId)
    .eq('role', 'driver');

  const { count: activeDrivers } = await supabase
    .from('flotte_adhesions')
    .select('*', { count: 'exact', head: true })
    .eq('fleet_id', fleetId)
    .eq('role', 'driver')
    .eq('is_active', true);

  const fleet: FleetMetrics = {
    total_vehicles:  totalVehicles  ?? 0,
    active_vehicles: activeVehicles ?? 0,
    max_vehicles:    sub?.plans?.max_vehicles ?? null,
    total_drivers:   totalDrivers   ?? 0,
    active_drivers:  activeDrivers  ?? 0,
  };

  if (!sub) return { subscription: null, fleet };

  const plan: AccountPlan = {
    id:           sub.plans?.id ?? '',
    name:         sub.plans?.name ?? 'Starter',
    max_vehicles: sub.plans?.max_vehicles ?? null,
    features:     sub.plans?.features ?? {
      qr_premium: false, ai_pulse: false, dvir: true,
      transit_cemac: false, export_pdf: false,
    },
  };

  const subscription: AccountSubscription = {
    id:              sub.id,
    status:          sub.statut as AccountSubscription['status'],
    plan,
    period_start:    sub.period_start,
    period_end:      sub.period_end,
    trial_ends_at:   sub.trial_ends_at ?? null,
    grace_ends_at:   sub.grace_ends_at ?? null,
    next_amount:     sub.next_amount ?? null,
    payment_method:  sub.payment_method ?? null,
    last_payment_at: sub.last_payment_at ?? null,
    next_billing_at: sub.next_billing_at ?? null,
  };

  return { subscription, fleet };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAccountStatus(): AccountStatus & { refetch: () => void } {
  const [state, setState] = useState<Omit<AccountStatus, 'daysRemaining' | 'trialDaysLeft' | 'isHealthy' | 'requiresAction' | 'actionMessage'>>({
    subscription: null,
    fleet:        null,
    isLoading:    true,
    error:        null,
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const { subscription, fleet } = await fetchAccountStatus();
      setState({ subscription, fleet, isLoading: false, error: null });
    } catch (err) {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: 'Impossible de charger l\'état du compte.',
      }));
      console.error('[useAccountStatus]', err);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const { subscription, fleet, isLoading, error } = state;
  const now = new Date().toISOString();

  const daysRemaining  = daysBetween(now, subscription?.period_end ?? null);
  const trialDaysLeft  = daysBetween(now, subscription?.trial_ends_at ?? null);
  const isHealthy      = subscription?.status === 'active' || subscription?.status === 'trialing';
  const requiresAction = ['pending_payment', 'grace_period', 'suspended', 'expired'].includes(
    subscription?.status ?? '',
  );
  const actionMessage  = buildActionMessage(subscription);

  return {
    subscription,
    fleet,
    isLoading,
    error,
    daysRemaining,
    trialDaysLeft,
    isHealthy,
    requiresAction,
    actionMessage,
    refetch: load,
  };
}
