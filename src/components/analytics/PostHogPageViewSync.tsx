import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { capturePageview } from "@/lib/analytics";

/**
 * Émet un $pageview par changement de route (stratégie unique, sans capture_pageview automatique).
 */
export function PostHogPageViewSync() {
  const location = useLocation();

  useEffect(() => {
    capturePageview();
  }, [location.pathname, location.search]);

  return null;
}
