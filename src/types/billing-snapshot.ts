export interface BillingSnapshot {
  /** True si un abonnement payant (non-free) existe mais n’est plus dans la fenêtre active. */
  lapsedPaid: boolean;
  subscription: {
    id: string;
    status: string;
    startsAt: string;
    endsAt: string;
    plan: {
      id: string;
      code: string;
      name: string;
      pricePerVehicle: number;
    } | null;
  } | null;
  recentPayments: Array<{
    id: string;
    provider: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: string;
  }>;
}
