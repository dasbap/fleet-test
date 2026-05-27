/**
 * Carte d'un appareil connecté — style Amazon Device Management.
 */

import { useState } from 'react';
import {
  Smartphone, Tablet, Monitor, Globe,
  MapPin, Clock, Shield, ShieldCheck, ShieldOff,
  MoreVertical, LogOut, Star,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { UserSession, DeviceType } from '@/types/device-session';

// ── Icône appareil ────────────────────────────────────────────────────────────

function DeviceIcon({ type, className }: { type: DeviceType; className?: string }) {
  const cls = `${className ?? 'h-5 w-5'}`;
  switch (type) {
    case 'mobile':  return <Smartphone className={cls} />;
    case 'tablet':  return <Tablet     className={cls} />;
    case 'desktop': return <Monitor    className={cls} />;
    default:        return <Globe      className={cls} />;
  }
}

// ── Formatage date relative ───────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min  = Math.floor(diff / 60000);
  if (min < 1)   return 'À l\'instant';
  if (min < 60)  return `Il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24)    return `Il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7)     return `Il y a ${d} jour${d > 1 ? 's' : ''}`;
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(iso));
}

// ── Composant ─────────────────────────────────────────────────────────────────

interface DeviceSessionCardProps {
  session:   UserSession;
  onRevoke:  (id: string) => Promise<boolean>;
  onTrust:   (id: string) => Promise<boolean>;
}

export function DeviceSessionCard({ session, onRevoke, onTrust }: DeviceSessionCardProps) {
  const [revoking, setRevoking] = useState(false);
  const [trusting, setTrusting] = useState(false);

  const handleRevoke = async () => {
    setRevoking(true);
    await onRevoke(session.id);
    setRevoking(false);
  };

  const handleTrust = async () => {
    setTrusting(true);
    await onTrust(session.id);
    setTrusting(false);
  };

  const location = [session.city, session.countryName].filter(Boolean).join(', ') || 'Localisation inconnue';
  const ip       = session.ipAddress ? `${session.ipAddress.split('.').slice(0, 3).join('.')}.***` : '—';

  return (
    <div className={`
      relative rounded-xl border bg-card p-4 transition-all
      ${session.isCurrent ? 'border-blue-200 bg-blue-50/30 dark:border-blue-800 dark:bg-blue-950/20' : 'border-border'}
    `}>
      {/* En-tête */}
      <div className="flex items-start gap-3">
        {/* Icône appareil */}
        <div className={`
          flex h-10 w-10 shrink-0 items-center justify-center rounded-xl
          ${session.isTrusted ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40' : 'bg-muted text-muted-foreground'}
        `}>
          <DeviceIcon type={session.deviceType} className="h-5 w-5" />
        </div>

        {/* Infos */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm text-foreground truncate">{session.deviceName}</p>
            {session.isCurrent && (
              <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 bg-blue-600">
                Session courante
              </Badge>
            )}
            {session.isTrusted && !session.isCurrent && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-emerald-600 border-emerald-300">
                <ShieldCheck className="h-2.5 w-2.5 mr-0.5" />
                Sûr
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{session.browser} · {session.os}</p>
        </div>

        {/* Menu actions (uniquement sessions non-courantes) */}
        {!session.isCurrent && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!session.isTrusted && (
                <DropdownMenuItem onClick={handleTrust} disabled={trusting}>
                  <Star className="h-4 w-4 mr-2 text-amber-500" />
                  {trusting ? 'Enregistrement…' : 'Marquer comme sûr'}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleRevoke}
                disabled={revoking}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {revoking ? 'Déconnexion…' : 'Déconnecter'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Détails */}
      <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{location}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Globe className="h-3 w-3 shrink-0" />
          <span className="font-mono">{ip}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3 shrink-0" />
          <span>{relativeTime(session.lastActiveAt)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Shield className="h-3 w-3 shrink-0" />
          <span>Depuis le {new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(session.createdAt))}</span>
        </div>
      </div>

      {/* Bouton déconnecter inline (mobile) — sessions non-courantes */}
      {!session.isCurrent && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleRevoke}
          disabled={revoking}
          className="mt-3 w-full h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 sm:hidden"
        >
          <LogOut className="h-3.5 w-3.5 mr-1.5" />
          {revoking ? 'Déconnexion…' : 'Déconnecter cet appareil'}
        </Button>
      )}
    </div>
  );
}
