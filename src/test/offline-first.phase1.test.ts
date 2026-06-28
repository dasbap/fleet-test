import { describe, expect, it } from "vitest";
import { classifySyncError } from "@esamba/domain-sync";
import { validateKmMonotone, mergeVehicleKmMonotone } from "@esamba/domain-validation";
import { appendActionJournalEntry, getActionJournal, clearActionJournal } from "@/lib/offline/action-journal";

describe("domain-sync conflicts", () => {
  it("détecte un doublon de créneau comme conflit", () => {
    const result = classifySyncError("shift:start", "créneau déjà ouvert");
    expect(result.isConflict).toBe(true);
    expect(result.isRetryable).toBe(false);
  });
});

describe("domain-validation km", () => {
  it("rejette km fin < km début", () => {
    expect(() => validateKmMonotone(100, 90)).toThrow();
  });

  it("fusionne km monotone", () => {
    expect(mergeVehicleKmMonotone(120, 150)).toBe(150);
  });
});

describe("action journal", () => {
  it("append une entrée locale", () => {
    clearActionJournal();
    appendActionJournalEntry({
      jobType: "incident:create",
      jobId: "job-1",
      summary: "Test incident",
    });
    const entries = getActionJournal();
    expect(entries[0]?.jobId).toBe("job-1");
    expect(entries[0]?.status).toBe("local");
  });
});
