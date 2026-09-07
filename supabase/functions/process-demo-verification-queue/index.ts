import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left[i]! ^ right[i]!;
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const token = req.headers.get("x-cron-secret")?.trim() ?? "";
  if (!CRON_SECRET || !timingSafeEqual(token, CRON_SECRET)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return Response.json({ ok: false, error: "server_configuration_error" }, { status: 503 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: claimed, error: claimError } = await admin.rpc("demo_claim_verification_email_queue", {
    p_limit: 100,
  });

  if (claimError) {
    console.error("[process-demo-verification-queue] claim failed", claimError.message);
    return Response.json({ ok: false, error: "claim_failed" }, { status: 500 });
  }

  const rows = (claimed ?? []) as Array<{ reservation_id: string; email: string }>;
  let sent = 0;
  let failed = 0;

  for (let offset = 0; offset < rows.length; offset += 20) {
    const batch = rows.slice(offset, offset + 20);
    const results = await Promise.all(
      batch.map(async ({ reservation_id, email }) => {
        const { error } = await admin.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: true,
            data: { demo_verification_pending: true },
          },
        });

        const { error: completeError } = await admin.rpc("demo_complete_verification_email", {
          p_reservation_id: reservation_id,
          p_success: !error,
          p_error: error?.message ?? null,
        });

        if (completeError) {
          console.error("[process-demo-verification-queue] complete failed", reservation_id, completeError.message);
        }

        return !error;
      }),
    );

    sent += results.filter(Boolean).length;
    failed += results.length - results.filter(Boolean).length;
  }

  return Response.json({ ok: true, claimed: rows.length, sent, failed });
});
