/**
 * Page complète — Sécurité du compte E-Samba.
 *
 * Onglets :
 *   1. Appareils connectés (liste sessions actives + déconnexion distante)
 *   2. Alertes de sécurité (historique notifications)
 */

import { useState } from 'react';
import { Shield, Smartphone, Bell, LogOut, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDeviceSessions }          from '@/hooks/useDeviceSessions';
import { useSecurityNotifications }   from '@/hooks/useSecurityNotifications';
import { DeviceSessionCard }           from './DeviceSessionCard';
import { SecurityNotificationsList }   from './SecurityNotificationsList';

type Tab = 'devices' | 'alerts';

export default function SecuritySettingsPage() {
  const [tab, setTab] = useState<Tab>('devices');
  const [revokeAllLoading, setRevokeAllLoading] = useState(false);
  const [revokeAllDone,    setRevokeAllDone]    = useState<number | null>(null);

  const {
    sessions, isLoading, error, revoke, revokeAll, trust, refetch,
  } = useDeviceSessions();

  const {
    notifications, unreadCount, isLoading: notifLoading, markRead,
  } = useSecurityNotifications();

  const handleRevokeAll = async () => {
    setRevokeAllLoading(true);
    const count = await revokeAll();
    setRevokeAllDone(count);
    setRevokeAllLoading(false);
  };

  const otherSessions = sessions.filter((s) => !s.isCurrent);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-heading text-lg font-semibold">Sécurité du compte</h1>
          <p className="text-sm text-muted-foreground">Gérez vos appareils connectés et alertes</p>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex rounded-xl border bg-muted/40 p-1">
        {([
          { id: 'devices', label: 'Appareils', icon: <Smartphone className="h-4 w-4" />, badge: sessions.length },
          { id: 'alerts',  label: 'Alertes',   icon: <Bell        className="h-4 w-4" />, badge: unreadCount },
        ] as const).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`
              flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all
              ${tab === t.id ? 'bg-white shadow-sm text-foreground dark:bg-card' : 'text-muted-foreground hover:text-foreground'}
            `}
          >
            {t.icon}
            {t.label}
            {t.badge > 0 && (
              <span className={`
                flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold
                ${tab === t.id
                  ? t.id === 'alerts' ? 'bg-blue-600 text-white' : 'bg-muted text-foreground'
                  : 'bg-muted text-muted-foreground'}
              `}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Onglet Appareils ── */}
      {tab === 'devices' && (
        <div className="space-y-4">
          {/* Action déconnecter tout */}
          {otherSessions.length > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800 p-3.5">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                    {otherSessions.length} autre{otherSessions.length > 1 ? 's' : ''} appareil{otherSessions.length > 1 ? 's' : ''} connecté{otherSessions.length > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Déconnectez tous les appareils si vous ne les reconnaissez pas.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRevokeAll}
                disabled={revokeAllLoading}
                className="shrink-0 ml-3 text-amber-700 border-amber-300 hover:bg-amber-100 dark:text-amber-300"
              >
                <LogOut className="h-3.5 w-3.5 mr-1.5" />
                {revokeAllLoading ? '…' : 'Tout déconnecter'}
              </Button>
            </div>
          )}

          {revokeAllDone !== null && revokeAllDone > 0 && (
            <p className="text-sm text-center text-emerald-600">
              ✓ {revokeAllDone} appareil{revokeAllDone > 1 ? 's' : ''} déconnecté{revokeAllDone > 1 ? 's' : ''}
            </p>
          )}

          {/* Erreur */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Skeleton */}
          {isLoading && (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          )}

          {/* Session courante */}
          {!isLoading && sessions.filter((s) => s.isCurrent).map((s) => (
            <div key={s.id} className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Session courante</p>
              <DeviceSessionCard session={s} onRevoke={revoke} onTrust={trust} />
            </div>
          ))}

          {/* Autres sessions */}
          {!isLoading && otherSessions.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Autres appareils ({otherSessions.length})
              </p>
              <div className="space-y-2">
                {otherSessions.map((s) => (
                  <DeviceSessionCard key={s.id} session={s} onRevoke={revoke} onTrust={trust} />
                ))}
              </div>
            </div>
          )}

          {/* Vide */}
          {!isLoading && sessions.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Smartphone className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Aucune session active détectée</p>
              <Button variant="ghost" size="sm" onClick={refetch} className="text-xs">
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Actualiser
              </Button>
            </div>
          )}

          <p className="text-xs text-center text-muted-foreground">
            Localisation approximative basée sur l'IP · Données conservées 90 jours
          </p>
        </div>
      )}

      {/* ── Onglet Alertes ── */}
      {tab === 'alerts' && (
        <SecurityNotificationsList
          notifications={notifications}
          isLoading={notifLoading}
          onMarkRead={markRead}
        />
      )}
    </div>
  );
}
