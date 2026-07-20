import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  buildJobCvMailtoHref,
  getJobDetailAccessUrl,
  isJobDetailUnlocked,
  unlockJobDetail,
} from "@/lib/carrieres-detail-access";
import type { JobPosting } from "@/types/carrieres";

const mockPosting: JobPosting = {
  id: "commercial-taxis-yaounde",
  title: "Agent Commercial Terrain — Segment Taxis & VTC, Yaoundé",
  contract: "CDI",
  location: "Yaoundé",
  availability: "immediate",
  availabilityLabel: "Immédiate",
  mission: "Mission test",
  context: "Contexte test",
  responsibilities: [],
  skills: [],
  generalSkills: [],
  education: [],
  conditions: [],
  kpis: [],
  evolution: "Evolution test",
  priority: "immediate",
};

describe("carrieres-detail-access", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_APP_URL", "https://www.e-samba.com");
    sessionStorage.clear();
  });

  it("génère une URL de fiche avec paramètre fiche", () => {
    expect(getJobDetailAccessUrl("commercial-taxis-yaounde")).toBe(
      "https://www.e-samba.com/carrieres?fiche=commercial-taxis-yaounde",
    );
  });

  it("débloque la fiche après intent CV", () => {
    expect(isJobDetailUnlocked("commercial-taxis-yaounde")).toBe(false);
    unlockJobDetail("commercial-taxis-yaounde");
    expect(isJobDetailUnlocked("commercial-taxis-yaounde")).toBe(true);
  });

  it("inclut le lien fiche dans le mailto candidature", () => {
    const href = buildJobCvMailtoHref(mockPosting);
    expect(href).toContain("mailto:rh@e-samba.com");
    expect(decodeURIComponent(href.replace(/\+/g, " "))).toContain(
      "https://www.e-samba.com/carrieres?fiche=commercial-taxis-yaounde",
    );
    expect(decodeURIComponent(href.replace(/\+/g, " "))).toContain("Je joins mon CV");
  });
});
