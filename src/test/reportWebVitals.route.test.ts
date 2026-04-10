import { describe, expect, it } from "vitest";
import { getWebVitalsRoutePath, setWebVitalsRoutePath } from "@/reportWebVitals";

describe("Web Vitals route SPA", () => {
  it("met à jour le chemin utilisé pour les payloads métriques", () => {
    setWebVitalsRoutePath("/dashboard/vehicles");
    expect(getWebVitalsRoutePath()).toBe("/dashboard/vehicles");
  });
});
