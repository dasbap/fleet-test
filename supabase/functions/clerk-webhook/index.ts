/**
 * clerk-webhook — Edge Function Supabase
 *
 * Reçoit les événements Clerk (user.created, user.updated, user.deleted,
 * organizationMembership.created) et maintient les tables Supabase en sync.
 *
 * Variables d'environnement requises :
 *   CLERK_WEBHOOK_SECRET      — signing secret du webhook Clerk (whsec_…)
 *   SUPABASE_URL              — injecté automatiquement
 *   SUPABASE_SERVICE_ROLE_KEY — injecté automatiquement
 *   SENTRY_DSN                — optionnel, capture les erreurs
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Webhook } from "npm:svix@1.41.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

// ── Client Supabase service role ─────────────────────────────────────────────

function createServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Config Supabase manquante.");
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── Sentry (best-effort, pas bloquant) ───────────────────────────────────────

async function captureException(err: unknown, ctx: Record<string, string> = {}): Promise<void> {
  const dsn = Deno.env.get("SENTRY_DSN");
  if (!dsn) return;
  try {
    const { hub } = await import("npm:@sentry/core@8");
    hub.captureException(err, { extra: ctx });
  } catch {
    // Sentry indisponible — on log uniquement
    console.error("[clerk-webhook] sentry capture failed", err, ctx);
  }
}

// ── Types Clerk simplifiés ───────────────────────────────────────────────────

interface ClerkEmailAddress {
  email_address: string;
  id: string;
}

interface ClerkUserData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email_addresses: ClerkEmailAddress[];
  primary_email_address_id: string | null;
  phone_numbers: { phone_number: string; id: string }[];
  primary_phone_number_id: string | null;
  created_at: number; // ms epoch
}

interface ClerkOrgMembershipData {
  organization: { id: string; name: string; slug: string | null };
  public_user_data: { user_id: string };
  role: string; // "org:admin" | "org:member" | etc.
}

interface ClerkEvent {
  type: string;
  data: Record<string, unknown>;
  object: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function primaryEmail(user: ClerkUserData): string | null {
  if (!user.primary_email_address_id) return null;
  return (
    user.email_addresses.find((e) => e.id === user.primary_email_address_id)?.email_address ?? null
  );
}

function primaryPhone(user: ClerkUserData): string | null {
  if (!user.primary_phone_number_id) return null;
  return (
    user.phone_numbers.find((p) => p.id === user.primary_phone_number_id)?.phone_number ?? null
  );
}

function fullName(user: ClerkUserData): string | null {
  const parts = [user.first_name, user.last_name].filter(Boolean);
  return parts.length ? parts.join(" ") : null;
}

/** Mappe le rôle Clerk ("org:admin" / "org:member") vers AppRole E-Samba */
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

// ── Handlers d'événements ────────────────────────────────────────────────────

/**
 * user.created
 *
 * 1. Crée le profil dans `profils` (ON CONFLICT DO NOTHING → idempotent)
 * 2. Si l'utilisateur n'a aucune flotte, crée une flotte trial + adhésion organizer
 */
async function handleUserCreated(
  supabase: ReturnType<typeof createServiceClient>,
  data: ClerkUserData,
): Promise<void> {
  const email = primaryEmail(data);
  const phone = primaryPhone(data);
  const name = fullName(data);

  // 1. Créer le profil (idempotent)
  const { data: profil, error: profilError } = await supabase
    .from("profils")
    .insert({
      clerk_user_id: data.id,
      full_name: name,
      phone: phone,
      // user_id est généré automatiquement par Supabase (uuid_generate_v4)
    })
    .select("user_id")
    .single();

  if (profilError) {
    // Code 23505 = contrainte unicité → déjà existant, on ignore
    if ((profilError as { code?: string }).code === "23505") {
      console.log(`[clerk-webhook] profil déjà existant pour ${data.id}`);
      return;
    }
    throw new Error(`Erreur insertion profil: ${profilError.message}`);
  }

  const userId = profil?.user_id as string;
  if (!userId) throw new Error("user_id manquant après insertion profil.");

  // 2. Vérifier si l'utilisateur est déjà membre d'une flotte
  const { data: existingAdhesions } = await supabase
    .from("flotte_adhesions")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if (existingAdhesions?.length) {
    // Déjà membre → pas de flotte trial à créer
    return;
  }

  // 3. Créer une flotte trial pour les nouveaux utilisateurs sans org Clerk
  const flotteName = name ? `Flotte de ${name}` : "Ma flotte";
  const { data: flotte, error: flotteError } = await supabase
    .from("flottes")
    .insert({
      name: flotteName,
      // org_id est le user_id → tenant isolé sans org Clerk
      org_id: userId,
      plan: "trial",
    })
    .select("id")
    .single();

  if (flotteError) {
    throw new Error(`Erreur création flotte trial: ${flotteError.message}`);
  }

  const fleetId = flotte?.id as string;

  // 4. Adhésion organizer
  const { error: adhesionError } = await supabase.from("flotte_adhesions").insert({
    fleet_id: fleetId,
    user_id: userId,
    role: "organizer",
    is_active: true,
  });

  if (adhesionError) {
    throw new Error(`Erreur création adhésion: ${adhesionError.message}`);
  }

  // 5. Abonnement trial (30 jours)
  const trialEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await supabase.from("abonnements").insert({
    fleet_id: fleetId,
    plan: "trial",
    status: "active",
    trial_ends_at: trialEnd,
  });

  console.log(`[clerk-webhook] user.created → profil ${userId}, flotte ${fleetId}`);
}

/**
 * user.updated
 *
 * Synchronise email / nom dans `profils`.
 */
async function handleUserUpdated(
  supabase: ReturnType<typeof createServiceClient>,
  data: ClerkUserData,
): Promise<void> {
  const { error } = await supabase
    .from("profils")
    .update({
      full_name: fullName(data),
      phone: primaryPhone(data),
      updated_at: new Date().toISOString(),
    })
    .eq("clerk_user_id", data.id);

  if (error) {
    throw new Error(`Erreur mise à jour profil: ${error.message}`);
  }

  console.log(`[clerk-webhook] user.updated → clerk_user_id ${data.id}`);
}

/**
 * user.deleted
 *
 * Soft-delete : désactive toutes les adhésions + marque le profil supprimé.
 * On ne supprime jamais de données (conformité audit CEMAC).
 */
async function handleUserDeleted(
  supabase: ReturnType<typeof createServiceClient>,
  data: { id: string },
): Promise<void> {
  // Récupérer le user_id Supabase
  const { data: profil, error: profilError } = await supabase
    .from("profils")
    .select("user_id")
    .eq("clerk_user_id", data.id)
    .maybeSingle();

  if (profilError || !profil?.user_id) {
    // Profil introuvable → rien à supprimer
    console.warn(`[clerk-webhook] user.deleted — profil introuvable pour ${data.id}`);
    return;
  }

  const userId = profil.user_id as string;

  // Désactiver toutes les adhésions
  await supabase
    .from("flotte_adhesions")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  // Marquer le profil comme supprimé
  await supabase
    .from("profils")
    .update({ deleted_at: new Date().toISOString() })
    .eq("user_id", userId);

  console.log(`[clerk-webhook] user.deleted → user_id ${userId}`);
}

/**
 * organizationMembership.created
 *
 * Synchronise un membership Clerk org → flotte E-Samba.
 * Si la flotte n'existe pas encore pour cette org Clerk, elle est créée.
 */
async function handleOrgMembershipCreated(
  supabase: ReturnType<typeof createServiceClient>,
  data: ClerkOrgMembershipData,
): Promise<void> {
  const clerkUserId = data.public_user_data.user_id;
  const clerkOrgId = data.organization.id;
  const mappedRole = mapClerkRole(data.role);

  // Récupérer le user_id Supabase
  const { data: profil } = await supabase
    .from("profils")
    .select("user_id")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (!profil?.user_id) {
    console.warn(
      `[clerk-webhook] orgMembership.created — profil introuvable pour clerk_user ${clerkUserId}`,
    );
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
    const { data: newFlotte, error: flotteError } = await supabase
      .from("flottes")
      .insert({
        name: data.organization.name,
        clerk_org_id: clerkOrgId,
        org_id: clerkOrgId,
        plan: "trial",
      })
      .select("id")
      .single();

    if (flotteError) {
      throw new Error(`Erreur création flotte org: ${flotteError.message}`);
    }
    flotte = newFlotte;
  }

  const fleetId = flotte!.id as string;

  // Upsert de l'adhésion (idempotent)
  const { error: adhesionError } = await supabase.from("flotte_adhesions").upsert(
    {
      fleet_id: fleetId,
      user_id: userId,
      role: mappedRole,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "fleet_id,user_id", ignoreDuplicates: false },
  );

  if (adhesionError) {
    throw new Error(`Erreur upsert adhésion org: ${adhesionError.message}`);
  }

  console.log(
    `[clerk-webhook] orgMembership.created → user ${userId}, flotte ${fleetId}, role ${mappedRole}`,
  );
}

// ── Point d'entrée ────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Méthode non autorisée." }, 405);
  }

  const webhookSecret = Deno.env.get("CLERK_WEBHOOK_SECRET");
  if (!webhookSecret) {
    console.error("[clerk-webhook] CLERK_WEBHOOK_SECRET manquant.");
    return jsonResponse({ error: "Configuration serveur manquante." }, 500);
  }

  // Lire le body en texte brut (requis pour la vérification svix)
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return jsonResponse({ error: "Impossible de lire le body." }, 400);
  }

  // ── Vérification signature svix ────────────────────────────────────────────
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return jsonResponse({ error: "Headers svix manquants." }, 401);
  }

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
    return jsonResponse({ error: "Signature webhook invalide." }, 401);
  }

  // ── Idempotence basée sur svix-id ──────────────────────────────────────────
  // Clerk rejoue les webhooks en cas d'échec → on vérifie si déjà traité
  const supabase = createServiceClient();

  const { data: existingEvent } = await supabase
    .from("clerk_webhook_events")
    .select("id")
    .eq("svix_id", svixId)
    .maybeSingle();

  if (existingEvent?.id) {
    console.log(`[clerk-webhook] event ${svixId} déjà traité — ignoré.`);
    return jsonResponse({ success: true, skipped: true });
  }

  // Enregistrer l'événement (avant traitement pour éviter les doublons en cas de replay)
  await supabase.from("clerk_webhook_events").insert({
    svix_id: svixId,
    event_type: event.type,
    payload: event.data,
    received_at: new Date().toISOString(),
  });

  // ── Dispatch ───────────────────────────────────────────────────────────────
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
        await handleOrgMembershipCreated(
          supabase,
          event.data as unknown as ClerkOrgMembershipData,
        );
        break;

      default:
        // Événement non géré — on acquitte quand même pour éviter les replays Clerk
        console.log(`[clerk-webhook] événement ignoré : ${event.type}`);
    }

    // Marquer comme traité avec succès
    await supabase
      .from("clerk_webhook_events")
      .update({ processed_at: new Date().toISOString(), status: "success" })
      .eq("svix_id", svixId);

    return jsonResponse({ success: true });
  } catch (err) {
    console.error(`[clerk-webhook] Erreur traitement ${event.type}:`, err);

    // Marquer comme échoué
    await supabase
      .from("clerk_webhook_events")
      .update({
        status: "error",
        error_message: err instanceof Error ? err.message : String(err),
        processed_at: new Date().toISOString(),
      })
      .eq("svix_id", svixId);

    await captureException(err, { eventType: event.type, svixId });

    return jsonResponse({ error: "Erreur traitement webhook." }, 500);
  }
});
