/**
 * Bannière sticky affichée pour les comptes démo E-Samba.
 *
 * Affiche : rôle, temps restant, et un indicateur visuel d'urgence
 * quand la session approche de l'expiration (<30 min).
 * Disparaît automatiquement si l'utilisateur n'est pas un compte démo.
 */

import { AlertTriangle, Clock, Eye, Info } from "lucide-react";
import { useDemoSession } from "@/hooks/useDemoSession";
import { demoRoleLabel } from "@/lib/demo/demoGuard";
import { CONTACT } from "@/config/navigation";

// ─── Sous-composant : badge temps restant ──────────────────────────────────

function TimeRemaining({ minutes }: { minutes: number }) {
  const urgent = minutes <= 30;
  const critical = minutes <= 10;

  const label =
    minutes === 0
      ? "Session expirée"
      : minutes < 60
        ? `${minutes} min restantes`
        : `${Math.floor(minutes / 60)}h${minutes % 60 > 0 ? ` ${minutes % 60}min` : ""} restantes`;

  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        critical
          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          : urgent
            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            : "bg-white/20 text-white",
      ].join(" ")}
    >
      <Clock className="h-3 w-3" aria-hidden />
      {label}
    </span>
  );
}

// ─── Bannière expirée ──────────────────────────────────────────────────────

function ExpiredBanner() {
  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-red-600 px-4 py-2 text-sm text-white">
      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
      <span>
        Votre session démo a expiré.{" "}
        <a
          href={CONTACT.mailtoHref}
          className="underline underline-offset-2 hover:no-underline"
        >
          Contactez-nous
        </a>{" "}
        pour renouveler l&apos;accès.
      </span>
    </div>
  );
}

// ─── Bannière compte expiré ────────────────────────────────────────────────

function AccountExpiredBanner() {
  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-gray-800 px-4 py-2 text-sm text-white">
      <Info className="h-4 w-4 shrink-0" aria-hidden />
      <span>
        Votre période de démonstration est terminée.{" "}
        <a
          href={CONTACT.mailtoHref}
          className="underline underline-offset-2 hover:no-underline"
        >
          Passez à un abonnement
        </a>{" "}
        pour continuer.
      </span>
    </div>
  );
}

// ─── Bannière principale ───────────────────────────────────────────────────

export function DemoSessionBanner() {
  const { isDemo, status, session, minutesRemaining } = useDemoSession();

  if (!isDemo) return null;

  if (status === "session_expired") return <ExpiredBanner />;
  if (status === "account_expired") return <AccountExpiredBanner />;
  if (status !== "active" || !session) return null;

  const urgent = minutesRemaining <= 30;

  return (
    <div
      className={[
        "sticky top-0 z-50 px-4 py-2",
        urgent
          ? "bg-amber-500"
          : "bg-indigo-600",
      ].join(" ")}
      role="banner"
      aria-label="Session de démonstration"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        {/* Gauche : mode démo + rôle */}
        <div className="flex items-center gap-2 text-white">
          <Eye className="h-4 w-4 shrink-0" aria-hidden />
          <span className="text-sm font-medium">
            Mode démo
          </span>
          <span className="hidden text-xs text-white/70 sm:inline">
            — {demoRoleLabel(session.demoRole)}
          </span>
        </div>

        {/* Centre : restrictions actives */}
        <div className="hidden text-xs text-white/80 sm:flex sm:items-center sm:gap-3">
          {!session.policy.can_view_billing && (
            <span>Facturation masquée</span>
          )}
          {!session.policy.can_export_data && (
            <span>Exports désactivés</span>
          )}
          {!session.policy.can_invite_users && (
            <span>Invitations désactivées</span>
          )}
        </div>

        {/* Droite : temps restant */}
        <TimeRemaining minutes={minutesRemaining} />
      </div>
    </div>
  );
}
