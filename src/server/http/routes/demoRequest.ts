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

const verificationEmailSchema = z.object({
  email: z.string().trim().email().max(320),
});

const VERIFICATION_STEP_TIMEOUT_MS = 6_000;

type VerificationReservation = {
  ok?: boolean;
  action?: "send" | "queued" | "cooldown";
  reservation_id?: string;
  retry_after_seconds?: number;
  available_at?: string;
  error?: string;
};

class VerificationStepTimeoutError extends Error {
  constructor(readonly step: string) {
    super(`verification email step timed out: ${step}`);
    this.name = "VerificationStepTimeoutError";
  }
}

async function withVerificationStepTimeout<T>(
  step: string,
  operation: () => PromiseLike<T>,
): Promise<T> {
  console.info(`[demo-verification-email] ${step}:start`);
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      Promise.resolve(operation()),
      new Promise<T>((_, reject) => {
        timeout = setTimeout(
          () => reject(new VerificationStepTimeoutError(step)),
          VERIFICATION_STEP_TIMEOUT_MS,
        );
      }),
    ]);
    console.info(`[demo-verification-email] ${step}:done`);
    return result;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function handleVerificationEmail(c: Context) {
  const startedAt = Date.now();
  console.info("[demo-verification-email] request:start");

  try {
    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return c.json({ ok: false, error: "invalid_json" }, 400);
    }

    const parsed = verificationEmailSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json({ ok: false, error: "invalid_payload", details: parsed.error.flatten() }, 400);
    }

    const admin = createSupabaseServiceClient();
    if (!admin) {
      return c.json({ ok: false, error: "server_configuration_error" }, 503);
    }

    const email = parsed.data.email.toLowerCase();
    const { data: reservationData, error: reservationError } =
      await withVerificationStepTimeout("reserve", () =>
        admin.rpc("demo_reserve_verification_email", { p_email: email }),
      );

    if (reservationError) {
      console.error("[demo-verification-email] reservation failed:", reservationError.message);
      return c.json({ ok: false, error: "reservation_failed" }, 500);
    }

    const reservation = reservationData as VerificationReservation | null;
    if (!reservation?.ok) {
      return c.json({ ok: false, error: reservation?.error ?? "reservation_failed" }, 400);
    }

    if (reservation.action === "cooldown") {
      return c.json(
        {
          ok: false,
          error: "email_cooldown",
          retry_after_seconds: reservation.retry_after_seconds ?? 180,
        },
        429,
      );
    }

    if (reservation.action === "queued") {
      return c.json(
        {
          ok: true,
          queued: true,
          available_at: reservation.available_at ?? null,
        },
        202,
      );
    }

    if (reservation.action !== "send" || !reservation.reservation_id) {
      return c.json({ ok: false, error: "reservation_failed" }, 500);
    }

    const { error: sendError } = await withVerificationStepTimeout("send-otp", () =>
      admin.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          data: { demo_verification_pending: true },
        },
      }),
    );

    const { error: completionError } = await withVerificationStepTimeout("complete", () =>
      admin.rpc("demo_complete_verification_email", {
        p_reservation_id: reservation.reservation_id,
        p_success: !sendError,
        p_error: sendError?.message ?? null,
      }),
    );

    if (completionError) {
      console.error("[demo-verification-email] completion failed:", completionError.message);
    }

    if (sendError) {
      console.error("[demo-verification-email] send failed, queued:", sendError.message);
      return c.json({ ok: true, queued: true }, 202);
    }

    return c.json({ ok: true, queued: false });
  } catch (error) {
    if (error instanceof VerificationStepTimeoutError) {
      console.error(`[demo-verification-email] ${error.step}:timeout`);
      return c.json(
        { ok: false, error: "verification_email_upstream_timeout", step: error.step },
        504,
      );
    }
    console.error("[demo-verification-email] unexpected failure:", error);
    return c.json({ ok: false, error: "verification_email_failed" }, 500);
  } finally {
    console.info(`[demo-verification-email] request:done ${Date.now() - startedAt}ms`);
  }
}

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

  if (authError || !user?.email) {
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

  const { error: insertError } = await admin.from("demo_requests").insert({
    full_name: parsed.data.full_name,
    email: normalizedEmail,
    company: parsed.data.company,
    phone: parsed.data.phone,
    company_identifier: parsed.data.company_identifier,
    country_code: parsed.data.country_code,
    verified_user_id: user.id,
  });

  if (insertError) {
    const { error: cleanupError } = await admin.auth.admin.deleteUser(user.id);
    if (cleanupError) {
      console.error("[demo-request] transient auth cleanup failed after insert error:", cleanupError.message);
    }

    if (insertError.code === "23505") {
      return c.json({ ok: false, error: "demo_email_already_used" }, 409);
    }
    console.error("[demo-request] insert failed:", insertError.message);
    return c.json({ ok: false, error: "demo_request_insert_failed" }, 500);
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error("[demo-request] transient auth user cleanup failed:", deleteError.message);
  }

  return c.json({ ok: true });
}

export function registerDemoRequestRoutes(app: Hono) {
  app.post("/api/demo/verification-email", handleVerificationEmail);
  app.post("/api/demo/request", handleSubmitDemoRequest);
}
