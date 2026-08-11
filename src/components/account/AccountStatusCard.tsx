/**
 * Carte "État du compte" — vue complète, inspirée Amazon/Stripe.
 *
 * Affiche : statut abonnement, plan, timeline, métriques flotte,
 * fonctionnalités actives et CTA selon l'état.
 *
 * Usage :
 *   <AccountStatusCard />  — charge les données via useAccountStatus()
 */

import { useNavigate } from 'react-router-dom';
import {
  CreditCard, Car, Users, Zap, QrCode,
  AlertTriangle, RefreshCw, ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAccountStatus } from '@/hooks/useAccountStatus';
import { StatusBadge } from './StatusBadge';
import { SubscriptionTimeline } from './SubscriptionTimeline';
import type { FleetMetrics, AccountSubscription } from '@/types/account-status';

// ─── Composant principal ──────────────────────────────────────────────────────

export function AccountStatusCard() {
  const { subscription, fleet, isLoading, error, actionMessage, requiresAction, daysRemaining, trialDaysLeft, refetch } =
    useAccountStatus();
  const navigate = useNavigate();

  if (isLoading) return <AccountStatusSkeleton />;

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" aria-hidden />
        <div className="flex-1">
          <p className="text-sm text-red-700">{error}</p>
        </div>
        <Button size="sm" variant="ghost" onClick={refetch} className="text-red-600">
          <RefreshCw className="h-4 w-4 mr-1" />Réessayer
        </Button>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center space-y-3">
        <p className="text-sm text-gray-500">Aucun abonnement actif.</p>
        <Button onClick={() => navigate('/pricing')} className="gap-2">
          <CreditCard className="h-4 w-4" /> Choisir un abonnement
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Bandeau alerte si action requise */}
      {actionMessage && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" aria-hidden />
          <p className="text-sm text-amber-800 flex-1">{actionMessage}</p>
        </div>
      )}

      <div className="p-5 space-y-5">
        {/* En-tête : plan + badge statut */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Abonnement</p>
            <h3 className="text-lg font-semibold text-gray-900 mt-0.5">
              Plan {subscription.plan.name}
            </h3>
          </div>
          <StatusBadge status={subscription.status} size="md" />
        </div>

        {/* Alerte jours restants essai/grâce */}
        {trialDaysLeft !== null && trialDaysLeft <= 3 && (
          <div className="text-sm text-blue-700 bg-blue-50 rounded-lg px-3 py-2">
            ⏳ Essai gratuit : <strong>{trialDaysLeft} jour{trialDaysLeft > 1 ? 's' : ''}</strong> restant
          </div>
        )}

        {/* Timeline */}
        <SubscriptionTimeline subscription={subscription} />

        {/* Métriques flotte */}
        {fleet && (
          <FleetMetricsRow
            fleet={fleet}
            maxVehicles={subscription.plan.vehicle_slots ?? fleet.vehicle_slots ?? subscription.plan.max_vehicles}
          />
        )}

        {/* Fonctionnalités actives */}
        <FeatureGrid features={subscription.plan.features} />

        {/* CTA */}
        <AccountCTA
          status={subscription.status}
          onPayment={() => navigate('/dashboard/billing')}
          onUpgrade={() => navigate('/pricing')}
          onRenew={() => navigate('/pricing')}
        />
      </div>
    </div>
  );
}

// ─── Métriques flotte ─────────────────────────────────────────────────────────

function FleetMetricsRow({
  fleet, maxVehicles,
}: { fleet: FleetMetrics; maxVehicles: number | null }) {
  const vehiclePercent =
    maxVehicles ? Math.round((fleet.active_vehicles / maxVehicles) * 100) : null;
  const nearLimit = vehiclePercent !== null && vehiclePercent >= 80;

  return (
    <div className="grid grid-cols-2 gap-3">
      <MetricTile
        icon={<Car className="h-4 w-4 text-blue-500" />}
        label="Véhicules actifs"
        value={`${fleet.active_vehicles}${maxVehicles ? ` / ${maxVehicles}` : ''}`}
        warn={nearLimit}
        warnMsg="Limite proche"
      />
      <MetricTile
        icon={<Users className="h-4 w-4 text-emerald-500" />}
        label="Chauffeurs actifs"
        value={String(fleet.active_drivers)}
      />
    </div>
  );
}

function MetricTile({
  icon, label, value, warn = false, warnMsg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  warn?: boolean;
  warnMsg?: string;
}) {
  return (
    <div className={`rounded-lg border p-3 space-y-1 ${warn ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-gray-50'}`}>
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className="text-lg font-semibold text-gray-800">{value}</p>
      {warn && warnMsg && (
        <p className="text-xs text-amber-600">{warnMsg}</p>
      )}
    </div>
  );
}

// ─── Grille fonctionnalités ───────────────────────────────────────────────────

function FeatureGrid({ features }: { features: AccountSubscription['plan']['features'] }) {
  const items = [
    { key: 'qr_premium',    label: 'QR Premium',    icon: <QrCode className="h-3.5 w-3.5" />, active: features.qr_premium },
    { key: 'ai_pulse',      label: 'IA Pulse',       icon: <Zap    className="h-3.5 w-3.5" />, active: features.ai_pulse },
    { key: 'export_pdf',    label: 'Export PDF',     icon: <ArrowRight className="h-3.5 w-3.5" />, active: features.export_pdf },
    { key: 'transit_cemac', label: 'Transit CEMAC',  icon: <ArrowRight className="h-3.5 w-3.5" />, active: features.transit_cemac },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {items.map(({ key, label, icon, active }) => (
        <span
          key={key}
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border ${
            active
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-gray-50 text-gray-400 border-gray-200 line-through'
          }`}
        >
          {icon}
          {label}
        </span>
      ))}
    </div>
  );
}

// ─── CTA selon statut ─────────────────────────────────────────────────────────

function AccountCTA({
  status, onPayment, onUpgrade, onRenew,
}: {
  status: AccountSubscription['status'];
  onPayment: () => void;
  onUpgrade: () => void;
  onRenew: () => void;
}) {
  if (status === 'active') {
    return (
      <Button variant="outline" size="sm" onClick={onUpgrade} className="w-full gap-2">
        <Zap className="h-4 w-4 text-blue-500" />
        Voir les options de mise à niveau
      </Button>
    );
  }

  if (status === 'trialing') {
    return (
      <Button size="sm" onClick={onUpgrade} className="w-full gap-2">
        <CreditCard className="h-4 w-4" />
        Choisir mon abonnement
      </Button>
    );
  }

  if (status === 'pending_payment' || status === 'grace_period') {
    return (
      <Button size="sm" onClick={onPayment} className="w-full gap-2 bg-amber-600 hover:bg-amber-700 text-white">
        <CreditCard className="h-4 w-4" />
        Régulariser mon paiement
      </Button>
    );
  }

  if (status === 'suspended' || status === 'expired') {
    return (
      <Button size="sm" onClick={onRenew} className="w-full gap-2 bg-red-600 hover:bg-red-700 text-white">
        <RefreshCw className="h-4 w-4" />
        Réactiver mon abonnement
      </Button>
    );
  }

  return null;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function AccountStatusSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <div className="flex justify-between">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-9 w-full rounded-md" />
    </div>
  );
}
