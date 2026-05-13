/**
 * clerk-webhook — Edge Function Supabase (v3 — schéma réel vérifié)
 *
 * Schéma vérifié via execute_sql :
 *   profils          : user_id UUID (PK, pas de default), clerk_user_id UNIQUE
 *   flottes          : org_id UUID, billing_status, trial_ends_at, clerk_org_id
 *   flotte_adhesions : role role_type enum, UNIQUE(fleet_id,user_id,role)
 *   abonnements      : plan_id UUID FK — non créé ici (couplé au billing)
 *
 * Variables d'environnement requises :
 *   CLERK_WEBHOOK_SECRET      — signing secret Clerk (whsec_…)
 *   SUPABASE_URL              — injecté automatiquement
 *   SUPABASE_SERVICE_ROLE_KEY — injecté automatiquement
 *   SENTRY_DSN                — optionnel
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Webhook } from "npm:svix@1.41.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

function createServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Config Supabase manquante.");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function captureException(err: unknown, ctx: Record<string, string> = {}): Promise<void> {
  const dsn = Deno.env.get("SENTRY_DSN");
  if (!dsn) return;
  try {
    const { hub } = await import("npm:@sentry/core@8");
    hub.captureException(err, { extra: ctx });
  } catch {
    console.error("[clerk-webhook] sentry capture failed", err, ctx);
  }
}

interface ClerkEmailAddress { email_address: string; id: string; }
interface ClerkUserData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email_addresses: ClerkEmailAddress[];
  primary_email_address_id: string | null;
  phone_numbers: { phone_number: string; id: string }[];
  primary_phone_number_id: string | null;
}
interface ClerkOrgMembershipData {
  organization: { id: string; name: string };
  public_user_data: { user_id: string };
  role: string;
}
interface ClerkEvent { type: string; data: Record<string, unknown>; }

function primaryPhone(user: ClerkUserData): string | null {
  if (!user.primary_phone_number_id) return null;
  return user.phone_numbers.find((p) => p.id === user.primary_phone_number_id)?.phone_number ?? null;
}

function fullName(user: ClerkUserData): string | null {
  const parts = [user.first_name, user.last_name].filter(Boolean);
  return parts.length ? parts.join(" ") : null;
}

function mapClerkRole(clerkRole: string): string {
  if (clerkRole === "org:admin") return "organizer";
  if (clerkRole === "org:manager") return "manager";
  return "driver";
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * user.created
 * → upsert profil (user_id généré côté app) ON CONFLICT clerk_user_id DO NOTHING
 * → si aucune adhésion, crée flotte trial + adhésion organizer
 */
async function handleUserCreated(
  supabase: ReturnType<typeof createServiceClient>,
  data: ClerkUserData,
): Promise<void> {
  const name = fullName(data);
  const phone = primaryPhone(data);
  const newUserId = crypto.randomUUID();

  const { error: profilError } = await supabase
    .from("profils")
    .upsert(
      { user_id: newUserId, clerk_user_id: data.id, full_name: name, phone },
      { onConflict: "clerk_user_id", ignoreDuplicates: true },
    );

  if (profilError) throw new Error(`Erreur upsert profil: ${profilError.message}`);

  // Récupérer le user_id réel (peut différer si doublon)
  const { data: profil, error: fetchError } = await supabase
    .from("profils")
    .select("user_id")
    .eq("clerk_user_id", data.id)
    .single();

  if (fetchError || !profil?.user_id) throw new Error("Profil introuvable après upsert.");
  const userId = profil.user_id as string;

  // Vérifier si déjà membre d'une flotte
  const { data: existingAdhesions } = await supabase
    .from("flotte_adhesions")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if (existingAdhesions?.length) {
    console.log(`[clerk-webhook] user.created → profil ${userId} (flotte existante)`);
    return;
  }

  // Créer flotte trial (30 jours)
  const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const flotteName = name ? `Flotte de ${name}` : "Ma flotte";

  const { data: flotte, error: flotteError } = await supabase
    .from("flottes")
    .insert({
      name: flotteName,
      org_id: userId,
      billing_status: "trial",
      trial_ends_at: trialEndsAt,
    })
    .select("id")
    .single();

  if (flotteError) throw new Error(`Erreur création flotte: ${flotteError.message}`);
  const fleetId = flotte!.id as string;

  const { error: adhesionError } = await supabase
    .from("flotte_adhesions")
    .insert({ fleet_id: fleetId, user_id: userId, role: "organizer", is_active: true });

  if (adhesionError) throw new Error(`Erreur adhésion: ${adhesionError.message}`);

  console.log(`[clerk-webhook] user.created → profil ${userId}, flotte ${fleetId}`);
}

/**
 * user.updated → sync full_name + phone
 */
async function handleUserUpdated(
  supabase: ReturnType<typeof createServiceClient>,
  data: ClerkUserData,
): Promise<void> {
  const { error } = await supabase
    .from("profils")
    .update({ full_name: fullName(data), phone: primaryPhone(data) })
    .eq("clerk_user_id", data.id);

  if (error) throw new Error(`Erreur update profil: ${error.message}`);
  console.log(`[clerk-webhook] user.updated → ${data.id}`);
}

/**
 * user.deleted → désactive les adhésions (soft delete, audit CEMAC)
 */
async function handleUserDeleted(
  supabase: ReturnType<typeof createServiceClient>,
  data: { id: string },
): Promise<void> {
  const { data: profil } = await supabase
    .from("profils")
    .select("user_id")
    .eq("clerk_user_id", data.id)
    .maybeSingle();

  if (!profil?.user_id) {
    console.warn(`[clerk-webhook] user.deleted — profil introuvable pour ${data.id}`);
    return;
  }

  await supabase
    .from("flotte_adhesions")
    .update({ is_active: false })
    .eq("user_id", profil.user_id);

  console.log(`[clerk-webhook] user.deleted → adhésions désactivées pour ${profil.user_id}`);
}

/**
 * organizationMembership.created → sync flotte org + adhésion
 */
async function handleOrgMembershipCreated(
  supabase: ReturnType<typeof createServiceClient>,
  data: ClerkOrgMembershipData,
): Promise<void> {
  const clerkUserId = data.public_user_data.user_id;
  const clerkOrgId = data.organization.id;
  const mappedRole = mapClerkRole(data.role);

  const { data: profil } = await supabase
    .from("profils")
    .select("user_id")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (!profil?.user_id) {
    console.warn(`[clerk-webhook] orgMembership — profil introuvable pour ${clerkUserId}`);
    return;
  }
  const userId = profil.user_id as string;

  // Trouver ou créer la flotte pour cette org Clerk
  let { data: flotte } = await supabase
    .from("flottes")
    .select("id")
    .eq("clerk_org_id", clerkOrgId)
    .maybeSingle();

  if (!flotte?.id) {
    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: newFlotte, error } = await supabase
      .from("flottes")
      .insert({
        name: data.organization.name,
        org_id: crypto.randomUUID(),
        clerk_org_id: clerkOrgId,
        billing_status: "trial",
        trial_ends_at: trialEndsAt,
      })
      .select("id")
      .single();

    if (error) throw new Error(`Erreur création flotte org: ${error.message}`);
    flotte = newFlotte;
  }
  const fleetId = flotte!.id as string;

  // Upsert adhésion — UNIQUE(fleet_id, user_id, role)
  const { error: adhesionError } = await supabase
    .from("flotte_adhesions")
    .upsert(
      { fleet_id: fleetId, user_id: userId, role: mappedRole, is_active: true },
      { onConflict: "fleet_id,user_id,role", ignoreDuplicates: false },
    );

  if (adhesionError) throw new Error(`Erreur upsert adhésion org: ${adhesionError.message}`);
  console.log(`[clerk-webhook] orgMembership → user ${userId}, flotte ${fleetId}, role ${mappedRole}`);
}

// ── Point d'entrée ────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return jsonResponse({ error: "Méthode non autorisée." }, 405);

  const webhookSecret = Deno.env.get("CLERK_WEBHOOK_SECRET");
  if (!webhookSecret) {
    console.error("[clerk-webhook] CLERK_WEBHOOK_SECRET manquant.");
    return jsonResponse({ error: "Configuration serveur manquante." }, 500);
  }

  let rawBody: string;
  try { rawBody = await req.text(); }
  catch { return jsonResponse({ error: "Body illisible." }, 400); }

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature)
    return jsonResponse({ error: "Headers svix manquants." }, 401);

  let event: ClerkEvent;
  try {
    const wh = new Webhook(webhookSecret);
    event = wh.verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkEvent;
  } catch (err) {
    console.error("[clerk-webhook] Signature invalide:", err);
    return jsonResponse({ error: "Signature invalide." }, 401);
  }

  const supabase = createServiceClient();

  // Idempotence via svix-id
  const { data: existingEvent } = await supabase
    .from("clerk_webhook_events")
    .select("id")
    .eq("svix_id", svixId)
    .maybeSingle();

  if (existingEvent?.id) {
    console.log(`[clerk-webhook] ${svixId} déjà traité — ignoré.`);
    return jsonResponse({ success: true, skipped: true });
  }

  await supabase.from("clerk_webhook_events").insert({
    svix_id: svixId,
    event_type: event.type,
    payload: event.data,
  });

  try {
    switch (event.type) {
      case "user.created":
        await handleUserCreated(supabase, event.data as unknown as ClerkUserData);
        break;
      case "user.updated":
        await handleUserUpdated(supabase, event.data as unknown as ClerkUserData);
        break;
      case "user.deleted":
        await handleUserDeleted(supabase, event.data as { id: string });
        break;
      case "organizationMembership.created":
        await handleOrgMembershipCreated(supabase, event.data as unknown as ClerkOrgMembershipData);
        break;
      default:
        console.log(`[clerk-webhook] événement ignoré : ${event.type}`);
    }

    await supabase
      .from("clerk_webhook_events")
      .update({ status: "success", processed_at: new Date().toISOString() })
      .eq("svix_id", svixId);

    return jsonResponse({ success: true });
  } catch (err) {
    console.error(`[clerk-webhook] Erreur ${event.type}:`, err);
    await supabase
      .from("clerk_webhook_events")
      .update({
        status: "error",
        error_message: err instanceof Error ? err.message : String(err),
        processed_at: new Date().toISOString(),
      })
      .eq("svix_id", svixId);
    await captureException(err, { eventType: event.type, svixId });
    return jsonResponse({ error: "Erreur traitement." }, 500);
  }
});
