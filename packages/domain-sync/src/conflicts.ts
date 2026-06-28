import type { OfflineJobType } from "@esamba/offline-contracts";

export type ConflictStrategy =
  | "append_only"
  | "reject_duplicate"
  | "idempotent"
  | "monotone"
  | "server_wins"
  | "ttl_cache";

/** Stratégie de conflit par type de job. */
export const CONFLICT_STRATEGY_BY_JOB: Record<OfflineJobType, ConflictStrategy> = {
  "incident:create": "append_only",
  "dvir:create": "append_only",
  "fuel:create": "append_only",
  "maintenance:note": "append_only",
  "scan:log": "append_only",
  "shift:start": "reject_duplicate",
  "shift:close": "idempotent",
};

export interface SyncErrorClassification {
  isConflict: boolean;
  isRetryable: boolean;
  userMessage: string;
}

const DUPLICATE_SHIFT_PATTERNS = [
  /déjà ouvert/i,
  /already open/i,
  /duplicate/i,
  /unique constraint/i,
];

const IDEMPOTENT_SUCCESS_PATTERNS = [/idempotent/i, /déjà traité/i, /already processed/i];

/**
 * Classifie une erreur de sync pour décider retry vs conflit.
 */
export function classifySyncError(
  jobType: OfflineJobType,
  errorMessage: string,
): SyncErrorClassification {
  const strategy = CONFLICT_STRATEGY_BY_JOB[jobType];
  const msg = errorMessage.trim();

  if (strategy === "reject_duplicate" && DUPLICATE_SHIFT_PATTERNS.some((p) => p.test(msg))) {
    return {
      isConflict: true,
      isRetryable: false,
      userMessage: "Un créneau est déjà ouvert sur ce véhicule.",
    };
  }

  if (strategy === "idempotent" && IDEMPOTENT_SUCCESS_PATTERNS.some((p) => p.test(msg))) {
    return {
      isConflict: false,
      isRetryable: false,
      userMessage: "Action déjà synchronisée.",
    };
  }

  if (/kilométrage|km_end|km fin/i.test(msg)) {
    return {
      isConflict: true,
      isRetryable: false,
      userMessage: msg,
    };
  }

  if (/network|timeout|fetch|connexion|503|502|504/i.test(msg)) {
    return {
      isConflict: false,
      isRetryable: true,
      userMessage: "Connexion instable. Nouvelle tentative automatique.",
    };
  }

  return {
    isConflict: false,
    isRetryable: true,
    userMessage: msg || "Erreur de synchronisation.",
  };
}

export interface JobExecutorResult {
  success: boolean;
  treatAsSuccess?: boolean;
  conflict?: boolean;
  errorMessage?: string;
}
