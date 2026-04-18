import { describe, expect, it } from "vitest";
import { hashPin } from "@/lib/biometric/pinHash";

describe("hashPin", () => {
  it("produit le même hachage pour le même PIN et sel", async () => {
    const a = await hashPin("1234", "salt-a");
    const b = await hashPin("1234", "salt-a");
    expect(a).toBe(b);
    expect(a.length).toBe(64);
  });

  it("différencie le sel", async () => {
    const a = await hashPin("1234", "salt-a");
    const b = await hashPin("1234", "salt-b");
    expect(a).not.toBe(b);
  });
});
