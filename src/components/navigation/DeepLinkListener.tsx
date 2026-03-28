import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { App } from "@capacitor/app";
import { isNativePlatform } from "@/lib/platform";
import { deepLinkLogDebug, deepLinkLogContext, deepLinkLogInfo } from "@/lib/deepLinks/deepLinkLogger";
import {
  ESAMBA_DEEP_LINK_WINDOW_EVENT,
  ESAMBA_INTERNAL_PATH_WINDOW_EVENT,
  type EsambaDeepLinkEventDetail,
  type EsambaInternalPathEventDetail,
} from "@/lib/deepLinks/deepLinkConfig";
import { navigateFromDeepLinkUrl } from "@/lib/deepLinks/deepLinkNavigation";
import { consumePendingDeepLink } from "@/lib/deepLinks/pendingDeepLink";

/**
 * Écoute les liens profonds natifs (Capacitor) et les événements push / bridge (`window`).
 * Doit rester sous `BrowserRouter` pour accéder à `useNavigate`.
 */
export function DeepLinkListener() {
  const navigate = useNavigate();

  useEffect(() => {
    const pending = consumePendingDeepLink();
    if (pending) {
      deepLinkLogDebug("Consommation file d’attente deep link", { pending });
      navigate(pending, { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const onEsambaUrl = (event: Event) => {
      const ce = event as CustomEvent<EsambaDeepLinkEventDetail>;
      const url = ce.detail?.url;
      if (!url) return;
      navigateFromDeepLinkUrl(url, navigate, { replace: true });
    };

    const onInternalPath = (event: Event) => {
      const ce = event as CustomEvent<EsambaInternalPathEventDetail>;
      const path = ce.detail?.path;
      if (!path || !path.startsWith("/")) {
        deepLinkLogInfo("Chemin interne push invalide", { path });
        return;
      }
      deepLinkLogDebug("Navigation interne (push)", { path });
      navigate(path, { replace: true });
    };

    window.addEventListener(ESAMBA_DEEP_LINK_WINDOW_EVENT, onEsambaUrl);
    window.addEventListener(ESAMBA_INTERNAL_PATH_WINDOW_EVENT, onInternalPath);
    return () => {
      window.removeEventListener(ESAMBA_DEEP_LINK_WINDOW_EVENT, onEsambaUrl);
      window.removeEventListener(ESAMBA_INTERNAL_PATH_WINDOW_EVENT, onInternalPath);
    };
  }, [navigate]);

  useEffect(() => {
    if (!isNativePlatform()) {
      deepLinkLogDebug("Deep links Capacitor inactifs (plateforme web)", deepLinkLogContext());
      return;
    }

    let removeUrlOpen: (() => void) | undefined;

    const handleUrl = (url: string, source: string) => {
      deepLinkLogInfo("URL entrante", { url, source, ...deepLinkLogContext() });
      navigateFromDeepLinkUrl(url, navigate, { replace: true });
    };

    void App.addListener("appUrlOpen", ({ url }) => {
      handleUrl(url, "appUrlOpen");
    }).then((handle) => {
      removeUrlOpen = () => void handle.remove();
    });

    void App.getLaunchUrl().then((res) => {
      if (res?.url) {
        handleUrl(res.url, "getLaunchUrl");
      }
    });

    return () => {
      removeUrlOpen?.();
    };
  }, [navigate]);

  return null;
}
