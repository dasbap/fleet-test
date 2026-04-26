import { supabase } from "@/integrations/supabase/client";

export type PaymentProvider = "orange" | "mtn";
export type PaymentStatus = "pending" | "completed" | "failed";

export interface PaymentTransaction {
  id: string;
  reference: string;
  provider: PaymentProvider;
  amount_xaf: number;
  status: PaymentStatus;
  transaction_id: string | null;
  fleet_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentTransactionInsert {
  reference: string;
  provider: PaymentProvider;
  amount_xaf: number;
  fleet_id: string;
}

/**
 * Accès table payment_transactions.
 */
export class PaymentTransactionRepository {
  async create(input: PaymentTransactionInsert): Promise<PaymentTransaction> {
    const { data, error } = await supabase
      .from("payment_transactions")
      .insert({
        reference: input.reference,
        provider: input.provider,
        amount_xaf: input.amount_xaf,
        fleet_id: input.fleet_id,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Error creating payment transaction:", error);
      throw new Error(error.message);
    }

    return data as PaymentTransaction;
  }

  async updateStatus(
    id: string,
    status: PaymentStatus,
    transactionId?: string | null,
  ): Promise<PaymentTransaction> {
    const payload: { status: PaymentStatus; transaction_id?: string | null } = { status };
    if (transactionId !== undefined) {
      payload.transaction_id = transactionId;
    }

    const { data, error } = await supabase
      .from("payment_transactions")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("Error updating payment transaction status:", error);
      throw new Error(error.message);
    }

    return data as PaymentTransaction;
  }
}
