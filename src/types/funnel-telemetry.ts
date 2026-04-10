export type FunnelEventType =
  | "onboarding_step_view"
  | "onboarding_step_completed"
  | "onboarding_step_skipped"
  | "onboarding_completed"
  | "one_click_attempt"
  | "one_click_success"
  | "one_click_failure";

export interface FunnelEventInput {
  eventType: FunnelEventType;
  step?: 1 | 2 | 3 | 4;
  status?: string;
  context?: Record<string, unknown>;
  occurredAt?: string;
}

export interface FunnelMetrics {
  windowDays: number;
  onboardingStep1DropRate: number;
  onboardingStep2DropRate: number;
  onboardingStep3DropRate: number;
  onboardingStep4DropRate: number;
  oneClickAttemptCount: number;
  oneClickSuccessCount: number;
  oneClickSuccessRate: number;
  avgTimeToValueSeconds: number;
}

