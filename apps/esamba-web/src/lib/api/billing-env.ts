import { randomUUID } from "node:crypto";

/** URL publique de l'app (callbacks et redirects paiement). */
export function getAppUrl(): string {
  // Preview Vercel : URL dynamique par déploiement (évite localhost ou www en preview)
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) {
    const url = process.env.VERCEL_URL;
    return (url.startsWith("http") ? url : `https://${url}`).replace(/\/$/, "");
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    const url = process.env.VERCEL_URL;
    return (url.startsWith("http") ? url : `https://${url}`).replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

export function getNotchPayApiKey(): string | undefined {
  return (
    process.env.NOTCH_PAY_API_KEY?.trim() ||
    process.env.NOTCHPAY_SECRET_KEY?.trim() ||
    process.env.NOTCH_API_KEY?.trim()
  );
}

export function getFapshiCredentials():
  | { apiUser: string; apiKey: string; endpoint: string }
  | undefined {
  const apiUser = process.env.FAPSHI_API_USER?.trim();
  const apiKey = process.env.FAPSHI_API_KEY?.trim();
  if (apiUser && apiKey) {
    return {
      apiUser,
      apiKey,
      endpoint: "https://live.fapshi.com/initiate-pay",
    };
  }

  if (apiKey) {
    return {
      apiUser: apiUser ?? "",
      apiKey,
      endpoint:
        process.env.FAPSHI_API_URL?.trim() ??
        "https://api.fapshi.com/v1/payments",
    };
  }

  return undefined;
}

const BILLING_MONTHS: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  semi_annual: 6,
  annual: 12,
};

export function resolveDurationMonths(
  billing?: string,
  durationMonths?: number,
): number {
  if (durationMonths && durationMonths > 0) {
    return durationMonths;
  }
  if (billing && BILLING_MONTHS[billing]) {
    return BILLING_MONTHS[billing];
  }
  return 1;
}

export function buildMerchantReference(prefix: string): string {
  const suffix = Date.now().toString(36).toUpperCase();
  const rand = randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  return `${prefix}-${suffix}-${rand}`;
}
