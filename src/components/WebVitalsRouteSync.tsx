import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Synchronise la route React Router avec les rapports Web Vitals (INP/LCP/CLS par écran)
 * sans charger web-vitals dans le bundle critique initial.
 */
export function WebVitalsRouteSync() {
  const { pathname } = useLocation();

  useEffect(() => {
    let cancelled = false;

    void import("@/reportWebVitals")
      .then(({ setWebVitalsRoutePath }) => {
        if (!cancelled) {
          setWebVitalsRoutePath(pathname);
        }
      })
      .catch((error) => {
        console.error("Échec de la synchronisation Web Vitals:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
