import { Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles/globals.css";
import { reportWebVitals } from "./reportWebVitals";
import { RoutePageFallback } from "@/components/RoutePageFallback";
import { preloadRouteChunksForPath } from "@/app/routes/preloadRouteChunks";
import { isValidUuid } from "@/lib/isUuid";
import { i18nReady } from "@/i18n";
import { scheduleDeferredMainThreadWork } from "@/lib/performance/deferredMainThreadWork";
import App from "./App.tsx";

const ACTIVE_FLEET_STORAGE_KEY = "esamba.active_fleet_id";

/** Délai max pour i18n (fichiers /locales/…) — évite un écran noir infini si le réseau bloque (LAN, VPN, pare-feu). */
const I18N_READY_TIMEOUT_MS = 35_000;

function escapeHtmlForBootstrap(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout: () => Error): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = window.setTimeout(() => {
      reject(onTimeout());
    }, ms);
    promise.then(
      (value) => {
        window.clearTimeout(id);
        resolve(value);
      },
      (err: unknown) => {
        window.clearTimeout(id);
        reject(err);
      }
    );
  });
}

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
        <p style="margin:0;color:#b8b8b8;font-size:14px;">${escapeHtmlForBootstrap(message)}</p>
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
    // Sentry (`instrument`) est chargé après le 1er rendu : son gros chunk ne doit pas bloquer i18n + React sur réseau lent / LAN.
    await withTimeout(
      i18nReady,
      I18N_READY_TIMEOUT_MS,
      () =>
        new Error(
          "Les traductions (/locales/…) n’ont pas répondu à temps. En accès via l’IP locale (192.168…), vérifiez le pare-feu, la connexion Wi‑Fi et désactivez temporairement le VPN du navigateur (ex. Opera GX). Sinon ouvrez http://localhost:8080 sur la machine qui exécute Vite."
        )
    );
    preloadRouteChunksForPath(window.location.pathname);
    createRoot(rootEl).render(
      <Suspense fallback={<RoutePageFallback />}>
        <App />
      </Suspense>
    );
    void import("./instrument").catch((err) => {
      console.error("Échec du chargement instrument (Sentry) :", err);
    });
    reportWebVitals();

    // Analytics est différé en production pour préserver le LCP/INP.
    if (import.meta.env.PROD) {
      scheduleDeferredMainThreadWork(() => {
        void import("@/lib/analytics")
          .then(({ initAnalytics }) => {
            initAnalytics();
          })
          .catch((error) => {
            console.error("Échec du chargement analytics:", error);
          });
      }, { delayMs: 8_000, idleTimeoutMs: 5_000 });
    }

    // PWA est chargée après load avec un délai pour éviter la compétition réseau initiale.
    if (import.meta.env.PROD) {
      window.addEventListener("load", () => {
        scheduleDeferredMainThreadWork(() => {
          void import("@/pwa").catch((error) => {
            console.error("Échec du chargement PWA:", error);
          });
        }, { delayMs: 10_000, idleTimeoutMs: 5_000 });
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
