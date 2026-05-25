/**
 * Composant <RoleBadge> — affiche le rôle d'un utilisateur avec les couleurs E-Samba.
 *
 * Usage :
 *   <RoleBadge role="organizer" />
 *   <RoleBadge role={member.role} size="sm" />
 *   <RoleBadge role={currentUser.role} showIcon />
 */

import { cn } from "@/lib/utils";
import type { PlatformRole } from "@/config/permissions";

// ─── Config par rôle ──────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<PlatformRole, { label: string; classes: string; icon: string }> = {
  admin: {
    label:   "Admin plateforme",
    classes: "bg-purple-100 text-purple-800 border-purple-200",
    icon:    "🛡️",
  },
  organizer: {
    label:   "Organisateur",
    classes: "bg-blue-100 text-blue-800 border-blue-200",
    icon:    "👑",
  },
  manager: {
    label:   "Manager",
    classes: "bg-emerald-100 text-emerald-800 border-emerald-200",
    icon:    "⚙️",
  },
  mechanic: {
    label:   "Mécanicien",
    classes: "bg-amber-100 text-amber-800 border-amber-200",
    icon:    "🔧",
  },
  driver: {
    label:   "Conducteur",
    classes: "bg-slate-100 text-slate-700 border-slate-200",
    icon:    "🚗",
  },
};

// ─── Tailles ──────────────────────────────────────────────────────────────────

const SIZE_CLASSES = {
  sm: "text-xs px-1.5 py-0.5",
  md: "text-xs px-2 py-1",
  lg: "text-sm px-2.5 py-1",
} as const;

// ─── Composant ────────────────────────────────────────────────────────────────

interface RoleBadgeProps {
  role: PlatformRole | null | undefined;
  size?: keyof typeof SIZE_CLASSES;
  showIcon?: boolean;
  className?: string;
}

export function RoleBadge({ role, size = "md", showIcon = false, className }: RoleBadgeProps) {
  if (!role) return null;

  const config = ROLE_CONFIG[role];
  if (!config) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        config.classes,
        SIZE_CLASSES[size],
        className,
      )}
    >
      {showIcon && <span aria-hidden="true">{config.icon}</span>}
      {config.label}
    </span>
  );
}

// ─── Hook utilitaire ─────────────────────────────────────────────────────────

/**
 * Retourne le label français d'un rôle (sans JSX).
 * Utile pour les titres de page, toasts, logs UI.
 */
export function getRoleLabel(role: PlatformRole | null | undefined): string {
  if (!role) return "Aucun rôle";
  return ROLE_CONFIG[role]?.label ?? role;
}
