import { describe, expect, it } from 'vitest';
import { normalizeFleetActivationMetrics } from '@/lib/fleet-activation-metrics';

describe('normalizeFleetActivationMetrics', () => {
  it('mappe les clés snake_case vers ActivationMetrics', () => {
    expect(
      normalizeFleetActivationMetrics({
        signup_count: 3,
        activated_day1: 1,
        activated_day7: 2,
        daily_closure_rate: 0.42,
        proof_submission_rate: 88.5,
        blocked_drivers_count: 1,
        average_driver_score: 76.25,
      }),
    ).toEqual({
      signupCount: 3,
      activatedDay1: 1,
      activatedDay7: 2,
      dailyClosureRate: 0.42,
      proofSubmissionRate: 88.5,
      blockedDriversCount: 1,
      averageDriverScore: 76.25,
    });
  });

  it('retourne des zéros si entrée invalide', () => {
    expect(normalizeFleetActivationMetrics(null)).toEqual({
      signupCount: 0,
      activatedDay1: 0,
      activatedDay7: 0,
      dailyClosureRate: 0,
      proofSubmissionRate: 0,
      blockedDriversCount: 0,
      averageDriverScore: 0,
    });
  });
});
