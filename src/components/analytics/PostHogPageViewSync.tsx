import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Émet un $pageview par changement de route.
 * Import dynamique de posthog pour ne pas gonfler le bundle initial.
 */
export function PostHogPageViewSync() {
  const location = useLocation();

  useEffect(() => {
    import("@/lib/analytics").then(({ capturePageview }) => capturePageview());
  }, [location.pathname, location.search]);

  return null;
}
