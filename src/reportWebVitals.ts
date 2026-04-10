import { onCLS, onFCP, onINP, onLCP, type Metric } from "web-vitals";

/** Route SPA courante (mis à jour par le routeur pour les métriques par écran). */
let currentRoutePath = typeof window !== "undefined" ? window.location.pathname : "/";

export function setWebVitalsRoutePath(path: string): void {
  currentRoutePath = path;
}

/** Lecture du chemin courant (tests / debug). */
export function getWebVitalsRoutePath(): string {
  return currentRoutePath;
}

/**
 * Envoi des Web Vitals pour monitoring (LCP, CLS, INP, FCP).
 * En dev : log en console. En prod : remplacer sendToAnalytics par votre endpoint ou GA.
 */
type WebVitalsPayload = {
  name: Metric["name"];
  id: string;
  value: number;
  rating: Metric["rating"];
  delta: number;
  navigationType: string;
  routePath: string;
  viewport: string;
  deviceType: "mobile" | "desktop";
  connectionType: string;
  timestamp: number;
};

function buildPayload(metric: Metric): WebVitalsPayload {
  const viewportWidth = window.innerWidth || 0;
  const connection = (
    navigator as Navigator & { connection?: { effectiveType?: string } }
  ).connection?.effectiveType;

  return {
    name: metric.name,
    id: metric.id,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    navigationType: metric.navigationType,
    routePath: currentRoutePath,
    viewport: `${viewportWidth}x${window.innerHeight || 0}`,
    deviceType: viewportWidth <= 768 ? "mobile" : "desktop",
    connectionType: connection ?? "unknown",
    timestamp: Date.now(),
  };
}

function sendToAnalytics(metric: Metric) {
  const payload = buildPayload(metric);

  if (import.meta.env.DEV) {
    console.log("[Web Vitals]", payload.name, payload.value, payload);
  } else {
    const endpoint = import.meta.env.VITE_WEB_VITALS_ENDPOINT;
    if (!endpoint) return;

    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, body);
      return;
    }

    void fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  }
}

export function reportWebVitals() {
  onCLS(sendToAnalytics);
  onINP(sendToAnalytics);
  onLCP(sendToAnalytics);
  onFCP(sendToAnalytics);
}
