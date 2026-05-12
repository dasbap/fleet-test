/**
 * Webhook Clerk → Supabase
 * Synchronise les événements Clerk (utilisateurs, organisations, adhésions)
 * vers les tables `profils`, `flottes` et `flotte_adhesions` de Supabase.
 *
 * URL à enregistrer dans le dashboard Clerk :
 *   https://www.e-samba.com/api/webhooks/clerk
 *
 * Événements à activer dans Clerk :
 *   user.created | user.updated
 *   organization.created | organization.updated
 *   organizationMembership.created | organizationMembership.updated
 */

import { Webhook } from "svix";
import { createClient } from "@supabase/supabase-js";

// Client Supabase avec le service role (bypass RLS — serveur uniquement)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[Clerk webhook] CLERK_WEBHOOK_SECRET manquant");
    return new Response("Configuration manquante", { status: 500 });
  }

  // Lire le corps et les headers nécessaires à la vérification svix
  const payload = await req.text();
  const headers: Record<string, string> = {
    "svix-id": req.headers.get("svix-id") ?? "",
    "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
    "svix-signature": req.headers.get("svix-signature") ?? "",
  };

  // Vérification de la signature Clerk (rejette les requêtes non authentifiées)
  let event: { type: string; data: Record<string, unknown> };
  try {
    const wh = new Webhook(webhookSecret);
    event = wh.verify(payload, headers) as typeof event;
  } catch {
    return new Response("Signature invalide", { status: 401 });
  }

  const { type, data } = event;

  try {
    switch (type) {
      // ── Utilisateur créé ou mis à jour ─────────────────────────────────────
      case "user.created":
      case "user.updated": {
        const emails = data.email_addresses as { email_address: string }[] | undefined;
        const email = emails?.[0]?.email_address ?? null;
        const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ") || null;

        await supabaseAdmin.from("profils").upsert(
          {
            clerk_user_id: data.id as string,
            full_name: fullName,
            // Préserve le user_id Supabase existant si déjà présent
          },
          { onConflict: "clerk_user_id", ignoreDuplicates: false }
        );

        console.log(`[Clerk webhook] ${type} → profil synchronisé`, { clerkId: data.id, email });
        break;
      }

      // ── Organisation créée ou mise à jour ──────────────────────────────────
      case "organization.created":
      case "organization.updated": {
        await supabaseAdmin.from("flottes").upsert(
          {
            clerk_org_id: data.id as string,
            name: (data.name as string) ?? null,
          },
          { onConflict: "clerk_org_id", ignoreDuplicates: false }
        );

        console.log(`[Clerk webhook] ${type} → flotte synchronisée`, { clerkOrgId: data.id });
        break;
      }

      // ── Adhésion créée ou mise à jour ──────────────────────────────────────
      case "organizationMembership.created":
      case "organizationMembership.updated": {
        const org = data.organization as { id: string } | undefined;
        const member = data.public_user_data as { user_id: string } | undefined;
        const clerkRole = data.role as string | undefined;

        if (!org?.id || !member?.user_id) break;

        // Résoudre les IDs locaux depuis les clerk_*_id
        const [{ data: flotte }, { data: profil }] = await Promise.all([
          supabaseAdmin.from("flottes").select("id").eq("clerk_org_id", org.id).single(),
          supabaseAdmin.from("profils").select("user_id").eq("clerk_user_id", member.user_id).single(),
        ]);

        if (!flotte || !profil) {
          console.warn("[Clerk webhook] Flotte ou profil introuvable pour l'adhésion", {
            clerkOrgId: org.id,
            clerkUserId: member.user_id,
          });
          break;
        }

        // Mapper le rôle Clerk → rôle applicatif
        const role = clerkRole === "org:admin" ? "manager" : "driver";

        await supabaseAdmin.from("flotte_adhesions").upsert(
          {
            fleet_id: flotte.id,
            user_id: profil.user_id,
            role,
            is_active: true,
          },
          { onConflict: "fleet_id,user_id", ignoreDuplicates: false }
        );

        console.log(`[Clerk webhook] ${type} → adhésion synchronisée`, {
          fleetId: flotte.id,
          userId: profil.user_id,
          role,
        });
        break;
      }

      default:
        // Événement non géré — silencieux (ne pas retourner d'erreur)
        break;
    }
  } catch (err) {
    console.error(`[Clerk webhook] Erreur lors du traitement de ${type}`, err);
    return new Response("Erreur interne", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
