import { Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles/globals.css";
import { reportWebVitals } from "./reportWebVitals";
import { RoutePageFallback } from "@/components/RoutePageFallback";
import { preloadRouteChunksForPath } from "@/app/routes/preloadRouteChunks";

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

  try {
    await import("./instrument");
    preloadRouteChunksForPath(window.location.pathname);
    const { default: App } = await import("./App.tsx");
    createRoot(rootEl).render(
      <Suspense fallback={<RoutePageFallback />}>
        <App />
      </Suspense>
    );
    reportWebVitals();

    // i18n se charge en parallèle pour ne pas bloquer le rendu critique.
    void import("@/i18n").catch((error) => {
      console.error("Échec du chargement i18n:", error);
    });

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
