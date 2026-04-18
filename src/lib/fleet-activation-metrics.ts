import type { ActivationMetrics } from '@/types/activation-metrics';

const EMPTY: ActivationMetrics = {
  signupCount: 0,
  activatedDay1: 0,
  activatedDay7: 0,
  dailyClosureRate: 0,
  proofSubmissionRate: 0,
  blockedDriversCount: 0,
  averageDriverScore: 0,
};

/**
 * Normalise la réponse JSON de `fleet_activation_metrics` (snake_case Postgres).
 */
export function normalizeFleetActivationMetrics(raw: unknown): ActivationMetrics {
  if (!raw || typeof raw !== 'object') {
    return { ...EMPTY };
  }
  const o = raw as Record<string, unknown>;
  return {
    signupCount: toNum(o.signup_count),
    activatedDay1: toNum(o.activated_day1),
    activatedDay7: toNum(o.activated_day7),
    dailyClosureRate: toNum(o.daily_closure_rate),
    proofSubmissionRate: toNum(o.proof_submission_rate),
    blockedDriversCount: toNum(o.blocked_drivers_count),
    averageDriverScore: toNum(o.average_driver_score),
  };
}

function toNum(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}
