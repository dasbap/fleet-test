import { onCLS, onFCP, onINP, onLCP, type Metric } from "web-vitals";

/**
 * Envoi des Web Vitals pour monitoring (LCP, CLS, INP, FCP).
 * En dev : log en console. En prod : remplacer sendToAnalytics par votre endpoint ou GA.
 */
function sendToAnalytics(metric: Metric) {
  if (import.meta.env.DEV) {
    console.log("[Web Vitals]", metric.name, metric.value, metric);
  } else {
    // Exemple : envoyer vers un endpoint ou Google Analytics
    // if (typeof gtag === "function") gtag("event", metric.name, { value: metric.value, event_label: metric.id });
  }
}

export function reportWebVitals() {
  onCLS(sendToAnalytics);
  onINP(sendToAnalytics);
  onLCP(sendToAnalytics);
  onFCP(sendToAnalytics);
}
