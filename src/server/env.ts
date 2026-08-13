/**
 * Variables d’environnement du process Node (BFF). Aucun préfixe VITE_ : non exposé au bundle.
 * En dev, `tsx --env-file=.env.local` peut charger VITE_SUPABASE_* : relais acceptés pour éviter la duplication.
 */

export type PaymentProviderId = "manual" | "cinetpay" | "notch";

const PAYMENT_PROVIDER_VALUES: PaymentProviderId[] = ["manual", "cinetpay", "notch"];

export function getSupabaseUrl(): string {
  const v =
    process.env.SUPABASE_URL?.trim() ||
    process.env.VITE_SUPABASE_URL?.trim() ||
    "";
  if (!v) {
    throw new Error("SUPABASE_URL (ou VITE_SUPABASE_URL en dev) est requis pour le BFF.");
  }
  return v.replace(/\/$/, "");
}

export function getSupabaseAnonKey(): string {
  const v =
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.VITE_SUPABASE_ANON_KEY?.trim() ||
    "";
  if (!v) {
    throw new Error(
      "SUPABASE_ANON_KEY (ou VITE_SUPABASE_ANON_KEY en dev) est requis pour le BFF.",
    );
  }
  return v;
}

export function getSupabaseServiceRoleKey(): string | undefined {
  const v = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return v || undefined;
}

/** Secret webhook mode generic (`PAYMENT_WEBHOOK_SECRET` ou alias historique `PAYMENTS_WEBHOOK_SECRET`). */
export function getPaymentsWebhookSecret(): string | undefined {
  const v =
    process.env.PAYMENT_WEBHOOK_SECRET?.trim() ||
    process.env.PAYMENTS_WEBHOOK_SECRET?.trim();
  return v || undefined;
}

/** Clé API Notch Pay pour les appels sortants (initiation paiement, vérif statut). */
export function getNotchApiKey(): string | undefined {
  const v =
    process.env.NOTCH_PAY_API_KEY?.trim() ||
    process.env.NOTCH_API_KEY?.trim();
  return v || undefined;
}

export function getNotchWebhookSecret(): string | undefined {
  const v =
    process.env.NOTCH_PAY_WEBHOOK_SECRET?.trim() ||
    process.env.NOTCH_WEBHOOK_SECRET?.trim();
  return v || undefined;
}

export function getCinetpayWebhookSecret(): string | undefined {
  const v = process.env.CINETPAY_WEBHOOK_SECRET?.trim();
  return v || undefined;
}

export function getPaymentWebhookSecrets(): {
  paymentsWebhookSecret?: string;
  notchWebhookSecret?: string;
  cinetpayWebhookSecret?: string;
} {
  return {
    paymentsWebhookSecret: getPaymentsWebhookSecret(),
    notchWebhookSecret: getNotchWebhookSecret(),
    cinetpayWebhookSecret: getCinetpayWebhookSecret(),
  };
}

/** Fournisseur PSP par défaut pour les nouveaux paiements. */
export function getPaymentProvider(): PaymentProviderId {
  const raw = process.env.PAYMENT_PROVIDER?.trim().toLowerCase();
  if (raw && PAYMENT_PROVIDER_VALUES.includes(raw as PaymentProviderId)) {
    return raw as PaymentProviderId;
  }
  return "notch";
}

export function getAppUrl(): string {
  const v = process.env.APP_URL?.trim();
  return (v || "https://www.e-samba.com").replace(/\/$/, "");
}

export function getBackendUrl(): string {
  const v = process.env.BACKEND_URL?.trim();
  return (v || `${getAppUrl()}/api`).replace(/\/$/, "");
}

/** URL publique du webhook paiement (documentation / logs PSP). */
export function getPaymentWebhookPublicUrl(): string {
  return `${getBackendUrl()}/webhooks/payment`;
}
