import { DEMO_CREDENTIAL_ACCOUNTS } from "@/features/auth/data/demoCredentials";

/** Sous-ensemble affiché en accès démo rapide sur `/auth` (les N premiers comptes scriptés). */
export const DEMO_QUICK_ACCOUNTS = DEMO_CREDENTIAL_ACCOUNTS.slice(0, 3);

/** Classes Tailwind pour distinguer visuellement les rôles sur les boutons démo rapides. */
export const DEMO_QUICK_ROLE_COLORS = [
  "text-emerald-500",
  "text-blue-500",
  "text-amber-500",
] as const;
