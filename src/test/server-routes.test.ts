/** @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createServerApp } from "@/server/http/app";
import { toSupabaseInfrastructureError } from "@/lib/supabase-runtime-errors";

describe("BFF routes (Hono)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_ANON_KEY = "test-anon-key";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.PAYMENT_WEBHOOK_SECRET;
    delete process.env.PAYMENTS_WEBHOOK_SECRET;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("GET /health renvoie ok", async () => {
    const app = createServerApp();
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; service: string };
    expect(body.ok).toBe(true);
    expect(body.service).toBe("smart-fleet-bff");
  });

  it("GET /billing/subscriptions exige Bearer", async () => {
    const app = createServerApp();
    const org = "00000000-0000-4000-8000-000000000001";
    const fleet = "00000000-0000-4000-8000-000000000002";
    const res = await app.request(`/billing/subscriptions?org_id=${org}&fleet_id=${fleet}`);
    expect(res.status).toBe(401);
  });

  it("POST /billing/checkout exige Bearer", async () => {
    const app = createServerApp();
    const res = await app.request("/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId: "00000000-0000-4000-8000-000000000001",
        fleetId: "00000000-0000-4000-8000-000000000002",
        planCode: "pro",
        vehicleCount: 1,
      }),
    });
    expect(res.status).toBe(401);
  });

  it("POST /billing/mobile-money/initiate exige Bearer", async () => {
    const app = createServerApp();
    const res = await app.request("/billing/mobile-money/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId: "00000000-0000-4000-8000-000000000001",
        fleetId: "00000000-0000-4000-8000-000000000002",
        provider: "orange_money",
        phoneNumber: "+237600000000",
        amountXaf: 5000,
        planCode: "pro",
        vehicleCount: 1,
      }),
    });
    expect(res.status).toBe(401);
  });

  it("POST /webhooks/payment refuse sans secret", async () => {
    const app = createServerApp();
    const res = await app.request("/webhooks/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ external_ref: "ref-1", status: "succeeded" }),
    });
    expect(res.status).toBe(401);
  });

  it("POST /webhooks/payment avec secret valide mais sans service role → 503", async () => {
    process.env.PAYMENT_WEBHOOK_SECRET = "test-webhook-secret";
    const app = createServerApp();
    const body = JSON.stringify({ external_ref: "ref-ok", status: "succeeded" });
    const res = await app.request("/webhooks/payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-payments-webhook-secret": "test-webhook-secret",
      },
      body,
    });
    expect(res.status).toBe(503);
  });

  it("alias /api/billing/snapshot expose Deprecation", async () => {
    const app = createServerApp();
    const org = "00000000-0000-4000-8000-000000000001";
    const fleet = "00000000-0000-4000-8000-000000000002";
    const res = await app.request(`/api/billing/snapshot?org_id=${org}&fleet_id=${fleet}`);
    expect(res.headers.get("Deprecation")).toBe("true");
    expect(res.status).toBe(401);
  });

  it("alias /api/webhooks/payments/inbound expose Deprecation", async () => {
    const app = createServerApp();
    const res = await app.request("/api/webhooks/payments/inbound", {
      method: "POST",
      body: "{}",
    });
    expect(res.headers.get("Deprecation")).toBe("true");
    expect(res.status).toBe(401);
  });

  it("renvoie un 500 JSON stable quand une erreur schema Supabase remonte du serveur", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const app = createServerApp();
    app.get("/__test/schema-missing", () => {
      throw toSupabaseInfrastructureError(
        { code: "42P01", message: 'relation "journal_carburant" does not exist' },
        "test route",
      );
    });

    const res = await app.request("/__test/schema-missing");

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      ok: false,
      error: "SUPABASE_SCHEMA_MISSING",
    });
  });
});
