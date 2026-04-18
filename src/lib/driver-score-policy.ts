/** Seuil : en dessous, nouvelle affectation refusée (hors suspension critique). */
export const SCORE_ASSIGNMENT_MIN = 60;

/** Seuil critique : en dessous, affectation refusée (message suspension). */
export const SCORE_ASSIGNMENT_SUSPEND_MAX_EXCLUSIVE = 40;

/**
 * Indique si le score bloque toute nouvelle affectation (plage 40–59).
 */
export function isAssignmentRestrictedByScore(score: number | null | undefined): boolean {
  if (score == null || Number.isNaN(score)) {
    return false;
  }
  return score < SCORE_ASSIGNMENT_MIN && score >= SCORE_ASSIGNMENT_SUSPEND_MAX_EXCLUSIVE;
}

/**
 * Indique si le score correspond à une suspension d’affectation (&lt; 40).
 */
export function isAssignmentSuspendedByScore(score: number | null | undefined): boolean {
  if (score == null || Number.isNaN(score)) {
    return false;
  }
  return score < SCORE_ASSIGNMENT_SUSPEND_MAX_EXCLUSIVE;
}
