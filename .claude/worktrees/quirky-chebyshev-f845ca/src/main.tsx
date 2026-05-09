import { Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles/globals.css";
import { reportWebVitals } from "./reportWebVitals";
import { RoutePageFallback } from "@/components/RoutePageFallback";
import { preloadRouteChunksForPath } from "@/app/routes/preloadRouteChunks";
import { isValidUuid } from "@/lib/isUuid";
import { i18nReady } from "@/i18n";
import App from "./App.tsx";

const ACTIVE_FLEET_STORAGE_KEY = "esamba.active_fleet_id";

/** Supprime une ancienne valeur non UUID (ex. slug fleet-esamba-sn) restée dans le stockage. */
function clearInvalidActiveFleetStorage(): void {
  try {
    const v = localStorage.getItem(ACTIVE_FLEET_STORAGE_KEY);
    if (v && !isValidUuid(v)) {
      localStorage.removeItem(ACTIVE_FLEET_STORAGE_KEY);
    }
  } catch {
    /* stockage indisponible */
  }
}

// En dev : log des requêtes Supabase en échec (URL = table ou RPC) pour diagnostic
if (import.meta.env.DEV && import.meta.env.VITE_SUPABASE_URL) {
  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string).replace(/\/$/, "");
  const realFetch = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
    return realFetch.call(window, input, init).then((res) => {
      if (!res.ok && url.startsWith(supabaseUrl)) {
        const path = url.slice(supabaseUrl.length) || url;
        console.warn(
          "[Smart Fleet] Requête Supabase en échec:",
          res.status,
          path,
          "\n→ Table/RPC: voir l’URL (ex. /rest/v1/nom_table ou /rest/v1/rpc/nom_rpc).",
          "\n→ Vérifier les migrations: docs/verification-connexion-supabase.md § 3"
        );
      }
      return res;
    });
  };
}

if (import.meta.env.DEV) {
  void import("@/lib/performance/measureINP").then(({ measureINP }) => {
    measureINP();
  });
}

const renderBootstrapError = (message: string) => {
  const rootEl = document.getElementById("root");
  if (!rootEl) return;

  rootEl.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f0f0f;color:#f5f5f5;padding:16px;text-align:center;font-family:Inter,system-ui,sans-serif;">
      <div>
        <p style="margin:0 0 8px 0;font-size:16px;">Une erreur de démarrage est survenue.</p>
        <p style="margin:0;color:#b8b8b8;font-size:14px;">${message}</p>
        <p style="margin:12px 0 0 0;color:#b8b8b8;font-size:14px;">Essayez de recharger la page.</p>
      </div>
    </div>
  `;
};

const bootstrap = async () => {
  const rootEl = document.getElementById("root");
  if (!rootEl) {
    return;
  }

  clearInvalidActiveFleetStorage();

  try {
    await import("./instrument");
    await i18nReady;
    preloadRouteChunksForPath(window.location.pathname);
    createRoot(rootEl).render(
      <Suspense fallback={<RoutePageFallback />}>
        <App />
      </Suspense>
    );
    reportWebVitals();

    // Analytics est différé en production pour préserver le LCP/INP.
    if (import.meta.env.PROD) {
      window.setTimeout(() => {
        void import("@/lib/analytics")
          .then(({ initAnalytics }) => {
            initAnalytics();
          })
          .catch((error) => {
            console.error("Échec du chargement analytics:", error);
          });
      }, 3_000);
    }

    // PWA est chargée après load avec un délai pour éviter la compétition réseau initiale.
    if (import.meta.env.PROD) {
      window.addEventListener("load", () => {
        window.setTimeout(() => {
          void import("@/pwa").catch((error) => {
            console.error("Échec du chargement PWA:", error);
          });
        }, 2_000);
      });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur inconnue";
    console.error("Erreur de bootstrap React:", error);
    renderBootstrapError(message);
  }
};

void bootstrap();
