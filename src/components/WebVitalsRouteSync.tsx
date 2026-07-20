import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { setWebVitalsRoutePath } from "@/reportWebVitals";

/**
 * Synchronise la route React Router avec les rapports Web Vitals (INP/LCP/CLS par écran).
 */
export function WebVitalsRouteSync() {
  const { pathname } = useLocation();

  useEffect(() => {
    setWebVitalsRoutePath(pathname);
  }, [pathname]);

  return null;
}
