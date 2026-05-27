/**
 * États métier des paiements (`paiements.status` en base).
 *
 * Alignement : la colonne est `text` sans contrainte CHECK côté migrations historiques ;
 * on normalise les entrées webhook / PSP vers ces valeurs pour cohérence applicative.
 *
 * Idempotence :
 * - `(provider, idempotency_key)` est unique (insert initiation).
 * - Les webhooks peuvent être rejoués : `applyPaymentStatusUpdate` ne bloque pas si le statut est déjà la cible.
 * - L’activation d’abonnement après `succeeded` est idempotente via `abonnements.payment_id = paiements.id`.
 */

/** Valeurs persistées recommandées (ne pas inventer de synonymes en base sans migration). */
export const PAYMENT_STATUSES = [
  "initiated",
  "pending",
  "processing",
  "succeeded",
  "failed",
  "refunded",
  "canceled",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

const TERMINAL: ReadonlySet<PaymentStatus> = new Set([
  "succeeded",
  "failed",
  "refunded",
  "canceled",
]);

const SUCCESS_ALIASES = new Set([
  "succeeded",
  "success",
  "successful",
  "paid",
  "completed",
  "complete",
]);

const FAILED_ALIASES = new Set(["failed", "failure", "error", "rejected", "declined"]);

const PENDING_ALIASES = new Set(["pending", "initiated", "created", "processing", "in_progress"]);

/**
 * Normalise une chaîne reçue d’un PSP ou d’un webhook générique vers un statut canonique.
 * Retourne `null` si la valeur est inconnue (le routeur pourra répondre 400).
 */
export function normalizeInboundPaymentStatus(raw: string): PaymentStatus | null {
  const s = raw.trim().toLowerCase();
  if (SUCCESS_ALIASES.has(s)) return "succeeded";
  if (FAILED_ALIASES.has(s)) return "failed";
  if (PENDING_ALIASES.has(s)) {
    if (s === "processing" || s === "in_progress") return "processing";
    if (s === "initiated" || s === "created") return "pending";
    return "pending";
  }
  if (s === "refunded") return "refunded";
  if (s === "canceled" || s === "cancelled") return "canceled";
  if ((PAYMENT_STATUSES as readonly string[]).includes(s)) return s as PaymentStatus;
  return null;
}

export function isTerminalPaymentStatus(status: PaymentStatus): boolean {
  return TERMINAL.has(status);
}

/**
 * Indique si une transition depuis `current` vers `next` est autorisée (règle simple anti-régression).
 */
export function canTransitionPaymentStatus(current: string | null | undefined, next: PaymentStatus): boolean {
  if (!current?.trim()) return true;
  const normalizedCurrent = normalizeInboundPaymentStatus(current);
  if (!normalizedCurrent) return true;
  if (normalizedCurrent === next) return true;
  if (isTerminalPaymentStatus(normalizedCurrent)) {
    if (normalizedCurrent === "succeeded" && next === "refunded") return true;
    return false;
  }
  return true;
}
