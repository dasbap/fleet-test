import { describe, expect, it } from "vitest";
import {
  isSupabaseConnectionError,
  isSupabaseSchemaError,
  isSupabaseTimeoutError,
  serializeServerError,
  throwIfSupabaseInfrastructureError,
  toSupabaseInfrastructureError,
} from "@/lib/supabase-runtime-errors";

describe("supabase runtime infrastructure errors", () => {
  it("classifies missing PostgREST tables as internal server errors", () => {
    const cause = {
      code: "PGRST205",
      message: "Could not find the table 'public.alertes_automatiques' in the schema cache",
    };

    const error = toSupabaseInfrastructureError(cause, "dashboard alerts");

    expect(isSupabaseSchemaError(cause)).toBe(true);
    expect(error.statusCode).toBe(500);
    expect(error.publicCode).toBe("SUPABASE_SCHEMA_MISSING");
    expect(error.message).toContain("dashboard alerts");
    expect(error.cause).toBe(cause);
  });

  it("classifies missing RPCs, relationships, columns and tables as schema errors", () => {
    expect(isSupabaseSchemaError({ code: "PGRST202", message: "Could not find the function" })).toBe(true);
    expect(isSupabaseSchemaError({ code: "PGRST200", message: "relationship not found in schema cache" })).toBe(true);
    expect(isSupabaseSchemaError({ code: "42P01", message: 'relation "audit_logs" does not exist' })).toBe(true);
    expect(isSupabaseSchemaError({ code: "42703", message: 'column "resolved" does not exist' })).toBe(true);
    expect(isSupabaseSchemaError({ code: "42883", message: "function write_audit_log does not exist" })).toBe(true);
  });

  it("classifies server connection failures as internal server errors", () => {
    const cause = Object.assign(new TypeError("fetch failed"), {
      cause: { message: "getaddrinfo ENOTFOUND db.idsuntuizzpdzlibafdz.supabase.co" },
    });

    const error = toSupabaseInfrastructureError(cause, "remote Supabase connection");

    expect(isSupabaseConnectionError(cause)).toBe(true);
    expect(error.statusCode).toBe(500);
    expect(error.publicCode).toBe("SUPABASE_CONNECTION_FAILED");
    expect(error.cause).toBe(cause);
  });

  it("returns a bounded 504 for Supabase upstream timeouts", () => {
    const cause = new Error("Supabase upstream request timed out after 4000ms");
    cause.name = "SupabaseUpstreamTimeoutError";

    expect(isSupabaseTimeoutError(cause)).toBe(true);
    expect(toSupabaseInfrastructureError(cause, "magic link").publicCode).toBe("SUPABASE_UPSTREAM_TIMEOUT");
    expect(serializeServerError(cause)).toEqual({
      statusCode: 504,
      body: { ok: false, error: "SUPABASE_UPSTREAM_TIMEOUT" },
    });
  });

  it("does not turn authorization or validation errors into infrastructure errors", () => {
    const cause = { code: "42501", message: "permission denied for table flottes" };

    expect(() => throwIfSupabaseInfrastructureError(cause, "fleet read")).not.toThrow();
  });
});
