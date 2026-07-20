import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Date courte en français. */
export function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

/** Montant en franc CFA (zone CEMAC). */
export function formatXAF(amount: number) {
  return new Intl.NumberFormat("fr-CM", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(amount);
}
