import { format } from "date-fns";
import { fr } from "date-fns/locale/fr";

export function formatXaf(amount: number): string {
  return new Intl.NumberFormat("fr-CM", {
    style: "currency",
    currency: "XAF",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateShort(iso: string): string {
  try {
    return format(new Date(iso), "d MMM yyyy", { locale: fr });
  } catch {
    return "—";
  }
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "d MMM yyyy à HH:mm", { locale: fr });
  } catch {
    return "—";
  }
}

export const SEVERITY_UI = {
  info: {
    bar: "bg-primary",
    dot: "bg-primary",
    ring: "ring-primary/30",
    text: "text-primary",
    badge: "bg-primary/10 text-primary",
  },
  warning: {
    bar: "bg-warning",
    dot: "bg-warning",
    ring: "ring-warning/30",
    text: "text-warning",
    badge: "bg-warning/10 text-warning",
  },
  critical: {
    bar: "bg-destructive",
    dot: "bg-destructive",
    ring: "ring-destructive/30",
    text: "text-destructive",
    badge: "bg-destructive/10 text-destructive",
  },
} as const;
