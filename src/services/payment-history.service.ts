import {
  PaymentHistoryRepository,
  type BillingEventRow,
  type PaymentRow,
} from "@/repositories/payment-history.repository";

export type {
  PaymentProvider,
  PaymentStatus,
} from "@/repositories/payment-history.repository";

export interface PaymentRecord extends PaymentRow {
  planCode?: string;
  durationMonths?: number;
  vehicleCount?: number;
}

export type BillingEventRecord = BillingEventRow;

/**
 * Logique métier historique paiements / événements billing.
 */
export class PaymentHistoryService {
  constructor(private repository: PaymentHistoryRepository) {}

  async getPaymentHistory(orgId: string): Promise<PaymentRecord[]> {
    if (!orgId) {
      throw new Error("L'identifiant organisation est requis");
    }

    const rows = await this.repository.findPaymentsByOrg(orgId);
    return rows.map((row) => this.enrichPayment(row));
  }

  async getBillingEvents(fleetId: string): Promise<BillingEventRecord[]> {
    if (!fleetId) {
      throw new Error("L'identifiant de flotte est requis");
    }

    return this.repository.findBillingEventsByFleet(fleetId);
  }

  private enrichPayment(row: PaymentRow): PaymentRecord {
    const payload = row.raw_payload;
    return {
      ...row,
      planCode: payload?.planCode as string | undefined,
      durationMonths: payload?.durationMonths as number | undefined,
      vehicleCount: payload?.vehicleCount as number | undefined,
    };
  }
}
