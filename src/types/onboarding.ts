export type VehicleType = 'berline' | 'pickup' | '4x4' | 'camionnette' | 'bus' | 'camion';

export interface OnboardingStep1Data {
  plate: string;
  brand: string;
  model: string;
  km: number;
  type: VehicleType;
}

export interface OnboardingStep2Alerts {
  oil: boolean;
  revision: boolean;
  tires: boolean;
  brakes: boolean;
}

export type AlertThresholdType = keyof OnboardingStep2Alerts;

export interface OnboardingStep2Data {
  alerts: OnboardingStep2Alerts;
}

export interface OnboardingStep3Data {
  invites: string[];
}

export interface OnboardingStep4Data {
  confirmed: boolean;
}

export interface OnboardingData {
  step1?: OnboardingStep1Data;
  step2?: OnboardingStep2Data;
  step3?: OnboardingStep3Data;
  step4?: OnboardingStep4Data;
}

export interface OnboardingProgress {
  id: string;
  org_id: string;
  user_id: string;
  step: 1 | 2 | 3 | 4;
  completed: boolean;
  steps_data: OnboardingData;
  created_at?: string;
  updated_at?: string;
}
