import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const source = () =>
  readFileSync(
    "src/features/billing/components/SubscriptionManagementPanel.tsx",
    "utf8",
  );

describe("subscription terminate dialog", () => {
  it("uses inline confirmation instead of nesting a modal inside the details dialog", () => {
    const component = source();

    expect(component).toContain("const [terminatingId, setTerminatingId]");
    expect(component).toContain("const [confirmTerminateId, setConfirmTerminateId]");
    expect(component).toContain("confirmTerminateId !== selected.id");
    expect(component).toContain("onClick={() => setConfirmTerminateId(selected.id)}");
    expect(component).toContain("onClick={() => setConfirmTerminateId(null)}");
    expect(component).toContain("onClick={() => void handleTerminate(selected.id)}");
    expect(component).toContain("setTerminatingId(subscriptionId);");
    expect(component).toContain("setTerminatingId(null);");
    expect(component).toContain("terminatingId === selected.id || terminate.isPending");
    expect(component).toContain('className="mr-1.5 h-4 w-4 animate-spin"');
    expect(component).not.toContain("@/components/ui/alert-dialog");
    expect(component).not.toContain("<AlertDialog");
    expect(component).not.toContain("AlertDialogTrigger");
    expect(component).not.toContain("AlertDialogContent");
    expect(component).not.toContain("event.preventDefault();");
  });
});
