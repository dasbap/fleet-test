/**
 * Badge d'univers d'accès — affiche l'univers d'un utilisateur avec couleur et label.
 */

import { Shield, Clock, Users } from "lucide-react";
import { getUniverseLabel, getUniverseColorClass } from "@/lib/access/universeGuard";
import type { AccessUniverse } from "@/types/access";

interface UniverseBadgeProps {
  universe:  AccessUniverse;
  showIcon?: boolean;
  size?:     "sm" | "md";
  className?: string;
}

const UNIVERSE_ICONS: Record<AccessUniverse, React.ElementType> = {
  internal:  Shield,
  temporary: Clock,
  real:      Users,
};

export function UniverseBadge({
  universe,
  showIcon = true,
  size = "sm",
  className = "",
}: UniverseBadgeProps) {
  const Icon = UNIVERSE_ICONS[universe];
  const colorClass = getUniverseColorClass(universe);
  const label = getUniverseLabel(universe);
  const sizeClass = size === "sm" ? "text-xs px-1.5 py-0.5" : "text-sm px-2 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-medium ${colorClass} ${sizeClass} ${className}`}
      role="status"
      aria-label={`Univers : ${label}`}
    >
      {showIcon && <Icon className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} aria-hidden />}
      {label}
    </span>
  );
}
