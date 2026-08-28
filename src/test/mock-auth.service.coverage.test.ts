import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_FLEET_ID } from "@/mocks/demo/constants";
import { MockAuthService } from "@/services/mock-auth.service";

const STORAGE_KEY = "esamba-mock-auth-v1";

describe("MockAuthService", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(crypto, "randomUUID").mockReturnValue("00000000-0000-4000-8000-000000000001");
  });

  it("valide les erreurs de connexion", () => {
    const service = new MockAuthService();

    expect(service.signInWithPassword("   ", "abcd").error?.message).toBe("Identifiant requis");
    expect(service.signInWithPassword("user@example.com", "abc").error?.message).toContain("minimum 4");
    expect(service.signInWithPassword("bad-email", "abcd").error?.message).toBe("Email ou numéro de téléphone invalide");
    expect(service.signInWithPassword("12 34", "abcd").error?.message).toBe("Email ou numéro de téléphone invalide");
  });

  it("persiste une connexion email normalisée avec le rôle par défaut", () => {
    const service = new MockAuthService();

    expect(service.signInWithPassword("  John.Doe@Example.COM  ", "abcd")).toEqual({ error: null });
    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");

    expect(persisted.user.id).toBe("mock-00000000-0000-4000-8000-000000000001");
    expect(persisted.user.email).toBe("john.doe@example.com");
    expect(persisted.user.phone).toBeUndefined();
    expect(persisted.user.user_metadata.full_name).toBe("John Doe");
    expect(persisted.role).toBe("manager");
    expect(persisted.memberships).toEqual([
      {
        id: "mock-memb-mock-00000000-0000-4000-8000-000000000001",
        fleet_id: DEMO_FLEET_ID,
        role: "manager",
        is_active: true,
      },
    ]);
  });

  it.each([
    ["+221 77 123 45 67", "+221771234567"],
    ["77 123 45 67", "771234567"],
  ])("persiste un téléphone %s sous la forme %s", (identifier, normalized) => {
    const service = new MockAuthService();

    expect(service.signInWithPassword(identifier, "abcd", "driver")).toEqual({ error: null });
    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");

    expect(persisted.user.email).toBeUndefined();
    expect(persisted.user.phone).toBe(normalized);
    expect(persisted.user.user_metadata.full_name).toBe("Utilisateur mobile");
    expect(persisted.role).toBe("driver");
    expect(persisted.memberships[0]).toMatchObject({ fleet_id: DEMO_FLEET_ID, role: "driver" });
  });

  it("retourne null sans session, avec JSON invalide ou payload incomplet", () => {
    const service = new MockAuthService();

    expect(service.loadPersisted()).toBeNull();
    localStorage.setItem(STORAGE_KEY, "{");
    expect(service.loadPersisted()).toBeNull();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: {}, role: "manager" }));
    expect(service.loadPersisted()).toBeNull();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: { id: "u1" }, memberships: [] }));
    expect(service.loadPersisted()).toBeNull();
  });

  it("retourne une session valide sans la modifier", () => {
    const service = new MockAuthService();
    const payload = {
      user: { id: "u1", created_at: "2026-01-01T00:00:00.000Z", user_metadata: {} },
      role: "manager",
      memberships: [
        { id: "m1", fleet_id: DEMO_FLEET_ID, role: "manager", is_active: true },
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    expect(service.loadPersisted()).toEqual(payload);
  });

  it("reconstruit les adhésions absentes ou avec fleet_id invalide", () => {
    const service = new MockAuthService();

    for (const memberships of [[], [{ id: "m1", fleet_id: "fleet-esamba-sn", role: "manager", is_active: true }]]) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          user: { id: "u2", created_at: "2026-01-01T00:00:00.000Z", user_metadata: {} },
          role: "manager",
          memberships,
        }),
      );

      const loaded = service.loadPersisted();
      expect(loaded?.memberships).toEqual([
        {
          id: "mock-memb-u2",
          fleet_id: DEMO_FLEET_ID,
          role: "manager",
          is_active: true,
        },
      ]);
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null").memberships[0].fleet_id).toBe(DEMO_FLEET_ID);
    }
  });

  it("efface la session", () => {
    const service = new MockAuthService();
    localStorage.setItem(STORAGE_KEY, "value");

    service.clearSession();

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
