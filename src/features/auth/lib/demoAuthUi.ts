import type { DemoCredentialAccount } from "@/features/auth/data/demoCredentials";

export const IS_PROD = import.meta.env.PROD;
export const DEMO_UI_ENABLED = !IS_PROD && import.meta.env.VITE_ENABLE_DEMO_UI === "true";
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
