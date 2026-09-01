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

  if (authError || !user?.email) {
    return c.json({ ok: false, error: "invalid_token" }, 401);
  }

  const normalizedEmail = parsed.data.email.toLowerCase();
  if (user.email.toLowerCase() !== normalizedEmail) {
    return c.json({ ok: false, error: "verified_email_mismatch" }, 403);
  }

  // Important: seuls les comptes Auth créés spécifiquement pour la vérification
  // d'une demande de démo peuvent emprunter ce chemin. Un compte produit normal
  // ne doit jamais être supprimé par cette route.
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
    // Même en cas de doublon, ce compte n'avait d'autre rôle que la vérification.
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
    // La demande est déjà enregistrée. Ne pas transformer un succès métier en
    // faux échec utilisateur ; le nettoyage peut être repris côté administration.
    console.error("[demo-request] transient auth user cleanup failed:", deleteError.message);
  }

  return c.json({ ok: true });
}

export function registerDemoRequestRoutes(app: Hono) {
  app.post("/api/demo/request", handleSubmitDemoRequest);
}
