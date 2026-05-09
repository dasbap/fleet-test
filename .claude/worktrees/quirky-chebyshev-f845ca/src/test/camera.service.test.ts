import { describe, expect, it } from "vitest";
import { isUserCancellationMessage } from "@/lib/cameraCancellation";

describe("isUserCancellationMessage", () => {
  it("détecte les annulations courantes", () => {
    expect(isUserCancellationMessage("User cancelled photos app")).toBe(true);
    expect(isUserCancellationMessage("No image picked")).toBe(true);
    expect(isUserCancellationMessage("Camera cancelled")).toBe(true);
  });

  it("ne confond pas avec une erreur technique", () => {
    expect(isUserCancellationMessage("Permission denied permanently")).toBe(false);
    expect(isUserCancellationMessage("Network error")).toBe(false);
  });
});
