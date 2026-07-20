/**
 * Timeline visuelle de l'abonnement — inspirée Stripe/Amazon.
 * Affiche : début période → aujourd'hui → prochain paiement → fin période.
 */

import { format, parseISO, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { AccountSubscription } from '@/types/account-status';

interface SubscriptionTimelineProps {
  subscription: AccountSubscription;
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  return format(parseISO(d), 'd MMM yyyy', { locale: fr });
}

function clampPercent(n: number): number {
  return Math.min(100, Math.max(0, n));
}

export function SubscriptionTimeline({ subscription }: SubscriptionTimelineProps) {
  const start     = parseISO(subscription.period_start);
  const end       = parseISO(subscription.period_end);
  const now       = new Date();
  const total     = differenceInDays(end, start);
  const elapsed   = differenceInDays(now, start);
  const progress  = clampPercent(total > 0 ? (elapsed / total) * 100 : 0);

  // Couleur de la barre selon l'état
  const barColor =
    subscription.status === 'active'   ? 'bg-emerald-500' :
    subscription.status === 'trialing' ? 'bg-blue-500'    :
    subscription.status === 'grace_period' ? 'bg-orange-400' :
    'bg-red-400';

  const isTrialing    = subscription.status === 'trialing' && subscription.trial_ends_at;
  const isGracePeriod = subscription.status === 'grace_period' && subscription.grace_ends_at;

  return (
    <div className="space-y-3">
      {/* Barre de progression */}
      <div className="relative">
        <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        {/* Marqueur aujourd'hui */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
          style={{ left: `${progress}%` }}
        >
          <div className="h-3.5 w-3.5 rounded-full border-2 border-white bg-gray-700 shadow-sm" />
        </div>
      </div>

      {/* Labels dates */}
      <div className="flex justify-between text-xs text-gray-500">
        <span>{formatDate(subscription.period_start)}</span>
        <span className="font-medium text-gray-700">Aujourd'hui</span>
        <span>{formatDate(subscription.period_end)}</span>
      </div>

      {/* Jalons supplémentaires */}
      <div className="space-y-1.5">
        {isTrialing && (
          <TimelineRow
            label="Fin de l'essai gratuit"
            date={subscription.trial_ends_at!}
            color="text-blue-600"
            dot="bg-blue-400"
          />
        )}
        {isGracePeriod && (
          <TimelineRow
            label="Fin de la période de grâce"
            date={subscription.grace_ends_at!}
            color="text-orange-600"
            dot="bg-orange-400"
          />
        )}
        {subscription.next_billing_at && subscription.status === 'active' && (
          <TimelineRow
            label={`Prochain paiement${subscription.next_amount ? ` — ${subscription.next_amount.toLocaleString('fr-FR')} FCFA` : ''}`}
            date={subscription.next_billing_at}
            color="text-gray-600"
            dot="bg-gray-400"
          />
        )}
      </div>
    </div>
  );
}

function TimelineRow({
  label, date, color, dot,
}: { label: string; date: string; color: string; dot: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`h-2 w-2 rounded-full shrink-0 ${dot}`} aria-hidden />
      <span className={`text-xs ${color}`}>{label}</span>
      <span className="ml-auto text-xs text-gray-500">{formatDate(date)}</span>
    </div>
  );
}
