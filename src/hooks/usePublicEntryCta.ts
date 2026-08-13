import { LANDING_CTA } from "@/config/navigation";
import { useAuthOptional } from "@/hooks/useAuth";
import { getAppEntryPath } from "@/navigation/appEntryPath";

export function usePublicEntryCta() {
  const auth = useAuthOptional();
  const user = auth?.user ?? null;

  if (user) {
    return {
      href: getAppEntryPath(auth?.role),
      label: "Dashboard",
      isAuthenticated: true,
    } as const;
  }

  return {
    href: LANDING_CTA.signupHref,
    label: LANDING_CTA.signupLabel,
    isAuthenticated: false,
  } as const;
}
