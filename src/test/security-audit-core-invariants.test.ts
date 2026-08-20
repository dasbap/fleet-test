import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

const migration = read(
  "supabase/migrations/20260820110000_close_core_security_invariants.sql",
);
const webhook = read("src/server/domain/billing/processInboundPaymentWebhook.ts");
const notchWebhook = read("supabase/functions/notch-pay-webhook/index.ts");
const gpsIngest = read("src/server/http/routes/gpsIngest.ts");

describe("core security invariants", () => {
  it("fails closed for tenant permissions without a fleet scope", () => {
    expect(migration).toContain("p_fleet_id IS NULL AND p_action IN");
    expect(migration).toContain("'billing.manage'");
    expect(migration).toContain("'member.remove'");
    expect(migration).toContain("'vehicle.delete'");
    expect(migration).toContain("'missing_fleet_scope'");
    expect(migration).not.toContain("ORDER BY CASE fa.role::text");
  });

  it("serializes removal of active organizers and rejects loss of the last one", () => {
    expect(migration).toContain("prevent_last_active_organizer_loss");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("fa.id IS DISTINCT FROM OLD.id");
    expect(migration).toContain("fa.role = 'organizer'::public.role_type");
    expect(migration).toContain("fa.is_active = true");
    expect(migration).toContain("last_active_organizer_required");
    expect(migration).toContain("BEFORE UPDATE OR DELETE ON public.flotte_adhesions");
  });

  it("binds payment-effect completion and release to the worker claim token", () => {
    expect(migration).toContain("claim_token uuid");
    expect(migration).toContain("p_claim_token uuid");
    expect(migration).toContain("claim_token = p_claim_token");
    expect(migration).toContain("lease_until > now()");
    expect(webhook).toContain("p_claim_token: claimToken");
    expect(notchWebhook).toContain("p_claim_token: claimToken");
    expect(webhook).toContain("p_lease_seconds: 900");
    expect(notchWebhook).toContain("p_lease_seconds: 900");
  });

  it("does not consume a GPS nonce before payload validation and gateway-device authorization", () => {
    const parseIndex = gpsIngest.indexOf("gpsPayloadSchema.safeParse(body)");
    const bindingIndex = gpsIngest.indexOf("if (!isGatewayAuthorizedForImei(");
    const claimIndex = gpsIngest.indexOf("claimGatewayNonce(verifiedGateway)");

    expect(parseIndex).toBeGreaterThan(-1);
    expect(bindingIndex).toBeGreaterThan(parseIndex);
    expect(claimIndex).toBeGreaterThan(bindingIndex);
    expect(gpsIngest).toContain("GPS_GATEWAY_DEVICE_BINDINGS");
    expect(gpsIngest).toContain("IMEI non autorise pour ce gateway GPS.");
  });

  it("requires an explicit IMEI binding for every gateway", () => {
    expect(gpsIngest).toContain(
      "return getGatewayDeviceBindings()[gatewayId]?.includes(imei) === true;",
    );
    expect(gpsIngest).not.toContain("gatewayIds.length === 1");
    expect(gpsIngest).not.toContain("bindingIds.length === 0");
  });
});