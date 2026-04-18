export interface OnboardingData {
  step1?: {
    plate: string;
    brand: string;
    model: string;
    km: number;
    type: 'berline' | 'pickup' | '4x4' | 'camionnette' | 'bus' | 'camion';
  };
  step2?: {
    alerts: {
      oil: boolean;
      revision: boolean;
      tires: boolean;
      brakes: boolean;
    };
  };
  step3?: {
    invites: string[]; // emails
  };
}

export interface OnboardingProgress {
  id: string;
  step: 1 | 2 | 3;
  completed: boolean;
  data: OnboardingData;
}
