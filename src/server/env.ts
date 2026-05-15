/**
 * Variables d’environnement du process Node (BFF). Aucun préfixe VITE_ : non exposé au bundle.
 * En local, `tsx --env-file=.env.local` peut charger VITE_SUPABASE_* : on les relaie ici pour éviter la duplication de secrets.
 */
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

export function getPaymentsWebhookSecret(): string | undefined {
  const v = process.env.PAYMENTS_WEBHOOK_SECRET?.trim();
  return v || undefined;
}

/** Secret webhook Notch Pay (HMAC du corps brut, voir `webhookProviders.ts`). */
export function getNotchWebhookSecret(): string | undefined {
  const v = process.env.NOTCH_WEBHOOK_SECRET?.trim();
  return v || undefined;
}

/** Secret webhook CinetPay (HMAC du corps brut). */
export function getCinetpayWebhookSecret(): string | undefined {
  const v = process.env.CINETPAY_WEBHOOK_SECRET?.trim();
  return v || undefined;
}

/** Secrets agrégés pour la vérification des webhooks PSP côté BFF. */
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
