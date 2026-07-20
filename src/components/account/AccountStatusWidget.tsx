/**
 * Widget compact "État du compte" — pour sidebar, header ou drawer.
 *
 * Affiche le statut en 1 ligne + CTA si action requise.
 * Cliquer ouvre la carte complète (navigate vers /dashboard/billing).
 */

import { useNavigate } from 'react-router-dom';
import { ChevronRight, AlertTriangle } from 'lucide-react';
import { useAccountStatus } from '@/hooks/useAccountStatus';
import { StatusBadge } from './StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';

interface AccountStatusWidgetProps {
  className?: string;
}

export function AccountStatusWidget({ className = '' }: AccountStatusWidgetProps) {
  const { subscription, fleet, isLoading, requiresAction, trialDaysLeft } = useAccountStatus();
  const navigate = useNavigate();

  if (isLoading) {
    return <Skeleton className={`h-12 rounded-lg ${className}`} />;
  }

  if (!subscription) return null;

  const showTrialAlert = subscription.status === 'trialing'
    && trialDaysLeft !== null
    && trialDaysLeft <= 3;

  return (
    <button
      onClick={() => navigate('/dashboard/billing')}
      className={`
        w-full rounded-lg border px-3 py-2.5 flex items-center gap-3
        text-left transition-colors hover:bg-gray-50
        ${requiresAction || showTrialAlert
          ? 'border-amber-200 bg-amber-50 hover:bg-amber-100'
          : 'border-gray-200 bg-white'}
        ${className}
      `}
      aria-label="Voir l'état de votre compte"
    >
      {/* Icône alerte si nécessaire */}
      {(requiresAction || showTrialAlert) && (
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" aria-hidden />
      )}

      {/* Infos plan */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-700 truncate">
          Plan {subscription.plan.name}
        </p>
        {fleet && (
          <p className="text-xs text-gray-400 truncate">
            {fleet.active_vehicles} véhicule{fleet.active_vehicles > 1 ? 's' : ''} actif{fleet.active_vehicles > 1 ? 's' : ''}
          </p>
        )}
      </div>

      <StatusBadge status={subscription.status} size="sm" />

      <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" aria-hidden />
    </button>
  );
}
