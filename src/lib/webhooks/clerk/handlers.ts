/**
 * Handlers async Clerk → Supabase (service role).
 * Appelés uniquement depuis la route Vercel /api/webhooks/clerk.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fullNameFromUser,
  mapClerkRoleToFleetRole,
  primaryPhoneFromUser,
  type ClerkOrgMembershipPayload,
  type ClerkUserPayload,
} from "./pure.js";

const LOG = "[Clerk webhook]";

function randomUuid(): string {
  return globalThis.crypto.randomUUID();
}

/**
 * user.created : profil + flotte trial si aucune adhésion.
 */
export async function handleUserCreated(
  supabase: SupabaseClient,
  data: ClerkUserPayload,
): Promise<void> {
  const name = fullNameFromUser(data);
  const phone = primaryPhoneFromUser(data);
  const newUserId = randomUuid();

  const { error: profilError } = await supabase.from("profils").upsert(
    { user_id: newUserId, clerk_user_id: data.id, full_name: name, phone },
    { onConflict: "clerk_user_id", ignoreDuplicates: true },
  );

  if (profilError) throw new Error(`Erreur upsert profil: ${profilError.message}`);

  const { data: profil, error: fetchError } = await supabase
    .from("profils")
    .select("user_id")
    .eq("clerk_user_id", data.id)
    .single();

  if (fetchError || !profil?.user_id) throw new Error("Profil introuvable après upsert.");
  const userId = profil.user_id as string;

  const { data: existingAdhesions } = await supabase
    .from("flotte_adhesions")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if (existingAdhesions?.length) {
    console.log(`${LOG} user.created → profil ${userId} (flotte existante)`);
    return;
  }

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

  console.log(`${LOG} user.created → profil ${userId}, flotte ${fleetId}`);
}

export async function handleUserUpdated(
  supabase: SupabaseClient,
  data: ClerkUserPayload,
): Promise<void> {
  const { error } = await supabase
    .from("profils")
    .update({ full_name: fullNameFromUser(data), phone: primaryPhoneFromUser(data) })
    .eq("clerk_user_id", data.id);

  if (error) throw new Error(`Erreur update profil: ${error.message}`);
  console.log(`${LOG} user.updated → ${data.id}`);
}

export async function handleUserDeleted(
  supabase: SupabaseClient,
  data: { id: string },
): Promise<void> {
  const { data: profil } = await supabase
    .from("profils")
    .select("user_id")
    .eq("clerk_user_id", data.id)
    .maybeSingle();

  if (!profil?.user_id) {
    console.warn(`${LOG} user.deleted — profil introuvable pour ${data.id}`);
    return;
  }

  await supabase.from("flotte_adhesions").update({ is_active: false }).eq("user_id", profil.user_id);

  console.log(`${LOG} user.deleted → adhésions désactivées pour ${profil.user_id}`);
}

export async function handleOrgMembershipSync(
  supabase: SupabaseClient,
  data: ClerkOrgMembershipPayload,
): Promise<void> {
  const clerkUserId = data.public_user_data.user_id;
  const clerkOrgId = data.organization.id;
  const mappedRole = mapClerkRoleToFleetRole(data.role);

  const { data: profil } = await supabase
    .from("profils")
    .select("user_id")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (!profil?.user_id) {
    console.warn(`${LOG} orgMembership — profil introuvable pour ${clerkUserId}`);
    return;
  }
  const userId = profil.user_id as string;

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
        org_id: randomUuid(),
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

  const { error: adhesionError } = await supabase.from("flotte_adhesions").upsert(
    { fleet_id: fleetId, user_id: userId, role: mappedRole, is_active: true },
    { onConflict: "fleet_id,user_id,role", ignoreDuplicates: false },
  );

  if (adhesionError) throw new Error(`Erreur upsert adhésion org: ${adhesionError.message}`);
  console.log(`${LOG} orgMembership → user ${userId}, flotte ${fleetId}, role ${mappedRole}`);
}

/** Sync nom d’organisation Clerk → ligne `flottes` (upsert sur clerk_org_id). */
export async function handleOrganizationUpsert(
  supabase: SupabaseClient,
  data: { id: string; name?: string | null },
): Promise<void> {
  const name = (data.name ?? "").trim() || "Organisation";
  const { error } = await supabase.from("flottes").upsert(
    { clerk_org_id: data.id, name },
    { onConflict: "clerk_org_id", ignoreDuplicates: false },
  );
  if (error) throw new Error(`Erreur upsert flotte org: ${error.message}`);
  console.log(`${LOG} organization → flotte synchronisée`, { clerkOrgId: data.id });
}
