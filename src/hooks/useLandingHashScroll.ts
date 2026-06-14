import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { extractAnchorId, scrollToAnchorId } from "@/lib/navigation/publicNavScroll";

/** Scroll smooth vers l'ancre landing après navigation (ex. `/#features` depuis une autre page). */
export function useLandingHashScroll() {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname !== "/") return;

    const anchorId = extractAnchorId(location.hash);
    if (!anchorId) return;

    const timer = window.setTimeout(() => {
      scrollToAnchorId(anchorId);
    }, 100);

    return () => window.clearTimeout(timer);
  }, [location.pathname, location.hash]);
}
