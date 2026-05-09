import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getMobileTabsForRole, isTabActive } from "@/navigation/mobileTabs";
import { setLastMainTabPath } from "@/store";

/**
 * Enregistre le dernier onglet principal visité (store UI mobile).
 */
export function useMobileTabTracking(): void {
  const { pathname } = useLocation();
  const { role } = useAuth();

  useEffect(() => {
    const tabs = getMobileTabsForRole(role);
    const match = tabs.find((tab) => isTabActive(tab, pathname));
    if (match) {
      setLastMainTabPath(match.to);
    }
  }, [pathname, role]);
}
