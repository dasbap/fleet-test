import { describe, expect, it } from "vitest";
import { getSupabaseUrlFromAccessToken } from "../server/infra/supabaseUserClient.js";

function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.signature`;
}

describe("getSupabaseUrlFromAccessToken", () => {
  it("derives the Supabase project URL from the JWT issuer", () => {
    const token = makeJwt({
      iss: "https://zqxjvmejoktwlcqshnwi.supabase.co/auth/v1",
      sub: "00000000-0000-0000-0000-000000000000",
    });

    expect(getSupabaseUrlFromAccessToken(token)).toBe(
      "https://zqxjvmejoktwlcqshnwi.supabase.co",
    );
  });

  it("rejects non-Supabase issuers", () => {
    const token = makeJwt({ iss: "https://example.com/auth/v1" });
    expect(getSupabaseUrlFromAccessToken(token)).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(getSupabaseUrlFromAccessToken("not-a-jwt")).toBeNull();
  });
});
