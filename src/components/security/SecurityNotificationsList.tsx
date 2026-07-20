/**
 * Liste des alertes de sécurité avec marquage lu/non-lu.
 */

import { Bell, Smartphone, AlertTriangle, LogOut, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { SecurityNotification, SecurityNotificationType } from '@/types/device-session';

// ── Icône par type ────────────────────────────────────────────────────────────

function NotifIcon({ type }: { type: SecurityNotificationType }) {
  switch (type) {
    case 'new_device':          return <Smartphone   className="h-4 w-4 text-blue-500" />;
    case 'suspicious_location': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case 'session_revoked':
    case 'mass_revoke':         return <LogOut       className="h-4 w-4 text-red-500" />;
    case 'trusted_added':       return <ShieldCheck  className="h-4 w-4 text-emerald-500" />;
  }
}

// ── Composant ─────────────────────────────────────────────────────────────────

interface SecurityNotificationsListProps {
  notifications: SecurityNotification[];
  isLoading:     boolean;
  onMarkRead:    (ids?: string[]) => Promise<void>;
}

export function SecurityNotificationsList({
  notifications,
  isLoading,
  onMarkRead,
}: SecurityNotificationsListProps) {
  const unread = notifications.filter((n) => !n.isRead);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <Bell className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Aucune alerte de sécurité</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Actions en tête */}
      {unread.length > 0 && (
        <div className="flex items-center justify-between">
          <Badge variant="secondary">{unread.length} non lu{unread.length > 1 ? 'es' : 'e'}</Badge>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={() => onMarkRead()}
          >
            <Trash2 className="h-3 w-3 mr-1.5" />
            Tout marquer lu
          </Button>
        </div>
      )}

      {/* Liste */}
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className={`
            flex items-start gap-3 rounded-xl border p-3.5 transition-colors cursor-pointer
            ${!notif.isRead
              ? 'border-border bg-blue-50/40 dark:bg-blue-950/20'
              : 'border-border/50 bg-card opacity-75'}
          `}
          onClick={() => { if (!notif.isRead) void onMarkRead([notif.id]); }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' && !notif.isRead) void onMarkRead([notif.id]); }}
        >
          {/* Icône */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
            <NotifIcon type={notif.type} />
          </div>

          {/* Contenu */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground">{notif.title}</p>
              {!notif.isRead && (
                <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" aria-label="Non lu" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{notif.body}</p>
            <p className="text-[11px] text-muted-foreground/60 mt-1">
              {new Intl.DateTimeFormat('fr-FR', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              }).format(new Date(notif.createdAt))}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
