import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { isNativePlatform } from "@/lib/platform";
import { ROUTE_PATHS } from "@/navigation/routePaths";

function isTutorialDetailPath(pathname: string): boolean {
  return pathname.startsWith(`${ROUTE_PATHS.dashboardTutorials}/`);
}

function hasBrowserHistoryEntry(): boolean {
  const state = window.history.state as { idx?: number } | null;
  return typeof state?.idx === "number" && state.idx > 0;
}

export function NativeBackButtonBridge() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathnameRef = useRef(location.pathname);

  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    if (!isNativePlatform()) return;

    let cleanup: (() => void) | undefined;
    let cancelled = false;

    void import("@capacitor/app").then(({ App }) => {
      if (cancelled) return;

      void App.addListener("backButton", ({ canGoBack }) => {
        if (isTutorialDetailPath(pathnameRef.current)) {
          navigate(ROUTE_PATHS.dashboardTutorials);
          return;
        }

        if (canGoBack && hasBrowserHistoryEntry()) {
          window.history.back();
          return;
        }

        void App.minimizeApp();
      }).then((handle) => {
        cleanup = () => {
          void handle.remove();
        };
      });
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [navigate]);

  return null;
}
