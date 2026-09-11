import type { Context, Hono } from "hono";
import { z } from "zod";
import { getBearerToken } from "../auth.js";
import { createSupabaseServiceClient } from "../../infra/supabaseServiceClient.js";
import { createSupabaseUserClient } from "../../infra/supabaseUserClient.js";

const submitDemoRequestSchema = z.object({
  full_name: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(320),
  company: z.string().trim().min(1).max(200),
  phone: z.string().trim().min(1).max(40),
  company_identifier: z.string().trim().min(1).max(120),
  country_code: z.enum(["CM", "CF", "TD", "CG", "GA", "GQ"]),
});

async function handleSubmitDemoRequest(c: Context) {
  const token = getBearerToken(c.req.header("Authorization"));
  if (!token) {
    return c.json({ ok: false, error: "missing_auth_token" }, 401);
  }

  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    return c.json({ ok: false, error: "invalid_json" }, 400);
  }

  const parsed = submitDemoRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return c.json({ ok: false, error: "invalid_payload", details: parsed.error.flatten() }, 400);
  }

  const userClient = createSupabaseUserClient(token);
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser(token);

  if (authError || !user?.email || !user.email_confirmed_at) {
    return c.json({ ok: false, error: "invalid_token" }, 401);
  }

  const normalizedEmail = parsed.data.email.toLowerCase();
  if (user.email.toLowerCase() !== normalizedEmail) {
    return c.json({ ok: false, error: "verified_email_mismatch" }, 403);
  }

  if (user.user_metadata?.demo_verification_pending !== true) {
    return c.json({ ok: false, error: "email_already_registered" }, 409);
  }

  const admin = createSupabaseServiceClient();
  if (!admin) {
    return c.json({ ok: false, error: "server_configuration_error" }, 503);
  }

  const requestPayload = {
    full_name: parsed.data.full_name,
    email: normalizedEmail,
    company: parsed.data.company,
    phone: parsed.data.phone,
    company_identifier: parsed.data.company_identifier,
    country_code: parsed.data.country_code,
    verified_user_id: user.id,
  };

  const { data: existingRequest, error: existingRequestError } = await admin
    .from("demo_requests")
    .select("id,status,provisioned_user_id")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (existingRequestError) {
    console.error("[demo-request] existing request lookup failed:", existingRequestError.message);
    return c.json({ ok: false, error: "demo_request_lookup_failed" }, 500);
  }

  let writeError: { code?: string; message?: string } | null = null;

  if (existingRequest) {
    const canReopenLegacyAcceptedRequest =
      existingRequest.status === "accepted" && !existingRequest.provisioned_user_id;

    if (!canReopenLegacyAcceptedRequest) {
      const { error: cleanupError } = await admin.auth.admin.deleteUser(user.id);
      if (cleanupError) {
        console.error("[demo-request] transient auth cleanup failed after duplicate lookup:", cleanupError.message);
      }
      return c.json({ ok: false, error: "demo_email_already_used" }, 409);
    }

    const { error } = await admin
      .from("demo_requests")
      .update({
        ...requestPayload,
        status: "pending",
        decision_reason: null,
        decided_by: null,
        decided_at: null,
        admin_interacted_at: null,
        provisioned_user_id: null,
        invitation_url: null,
        processed_email_queued_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingRequest.id);
    writeError = error;
  } else {
    const { error } = await admin.from("demo_requests").insert(requestPayload);
    writeError = error;
  }

  if (writeError) {
    const { error: cleanupError } = await admin.auth.admin.deleteUser(user.id);
    if (cleanupError) {
      console.error("[demo-request] transient auth cleanup failed after write error:", cleanupError.message);
    }

    if (writeError.code === "23505") {
      return c.json({ ok: false, error: "demo_email_already_used" }, 409);
    }
    console.error("[demo-request] write failed:", writeError.message);
    return c.json({ ok: false, error: "demo_request_insert_failed" }, 500);
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error("[demo-request] transient auth user cleanup failed:", deleteError.message);
  }

  return c.json({ ok: true });
}

export function registerDemoRequestRoutes(app: Hono) {
  app.post("/api/demo/request", handleSubmitDemoRequest);
}
