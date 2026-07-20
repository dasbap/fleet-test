import type { DemoCredentialAccount } from "@/features/auth/data/demoCredentials";
import {
  DEMO_FEATURE_ENABLED,
  IS_PRODUCTION_BUILD,
} from "@/lib/demo/demoFeatureFlag";

export const IS_PROD = IS_PRODUCTION_BUILD;
export const DEMO_UI_ENABLED = DEMO_FEATURE_ENABLED;
export const DEMO_DEV_PASSWORD = DEMO_UI_ENABLED
  ? (import.meta.env.VITE_DEMO_PASSWORD as string | undefined) ?? ""
  : "";

export async function loadDemoAuthUiData(): Promise<{
  demoAccounts: DemoCredentialAccount[];
  demoQuickAccounts: DemoCredentialAccount[];
  demoRoleColors: ReadonlyArray<string>;
}> {
  const { DEMO_CREDENTIAL_ACCOUNTS } = await import("@/features/auth/data/demoCredentials");
  const { DEMO_QUICK_ACCOUNTS, DEMO_QUICK_ROLE_COLORS } = await import("@/features/auth/data/demoQuickAccess");
  return {
    demoAccounts: DEMO_CREDENTIAL_ACCOUNTS,
    demoQuickAccounts: DEMO_QUICK_ACCOUNTS,
    demoRoleColors: DEMO_QUICK_ROLE_COLORS,
  };
}
