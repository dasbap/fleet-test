// ============================================================
// FICHIER : src/app/dashboard/layout.tsx
// Layout principal du dashboard : sidebar + header
// Server Component — vérifie la session et charge les données org
//
// Schéma prod E-Samba :
//   profiles            → profils (user_id, full_name)
//   organization_members → flotte_adhesions + flottes + organisations
//   alerts (status new)  → alertes_automatiques (resolved = false)
//   subscription_*       → abonnements (par fleet_id)
// ============================================================

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";

const ACTIVE_SUBSCRIPTION_STATUSES = new Set([
  "trial",
  "active",
  "grace_period",
  "pending_payment",
]);

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/connexion");
  }

  const { data: profile } = await supabase
    .from("profils")
    .select("full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: membership } = await supabase
    .from("flotte_adhesions")
    .select(
      `
      fleet_id,
      role,
      flottes(
        id,
        name,
        org_id,
        organisations(id, name)
      )
    `,
    )
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const fleetRow = membership?.flottes;
  const fleet = Array.isArray(fleetRow) ? fleetRow[0] : fleetRow;
  const orgRow = fleet?.organisations;
  const org = Array.isArray(orgRow) ? orgRow[0] : orgRow;

  if (!membership?.fleet_id || !org?.id) {
    redirect("/onboarding");
  }

  const fleetId = membership.fleet_id;

  const [{ count: alertCount }, { data: subscription }] = await Promise.all([
    supabase
      .from("alertes_automatiques")
      .select("id", { count: "exact", head: true })
      .eq("fleet_id", fleetId)
      .eq("resolved", false),

    supabase
      .from("abonnements")
      .select("status, ends_at, grace_until")
      .eq("fleet_id", fleetId)
      .order("ends_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const now = new Date();
  const subscriptionExpired =
    subscription?.status === "suspended" ||
    (subscription?.grace_until != null &&
      new Date(subscription.grace_until) < now) ||
    (subscription?.ends_at != null &&
      new Date(subscription.ends_at) < now &&
      subscription?.status != null &&
      !ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status));

  const avatarUrl =
    (user.user_metadata?.avatar_url as string | undefined) ??
    (user.user_metadata?.avatar_path as string | undefined);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar alertCount={alertCount ?? 0} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {subscriptionExpired ? (
          <div className="bg-destructive px-4 py-2 text-center text-sm font-medium text-destructive-foreground">
            Votre abonnement a expiré.{" "}
            <Link
              href="/dashboard/abonnement"
              className="font-bold underline underline-offset-2"
            >
              Renouveler maintenant →
            </Link>
          </div>
        ) : null}

        <DashboardHeader
          orgName={org.name}
          fleetName={fleet?.name}
          userName={
            profile?.full_name ??
            user.email?.split("@")[0] ??
            "Utilisateur"
          }
          userEmail={user.email ?? ""}
          avatarUrl={avatarUrl}
          alertCount={alertCount ?? 0}
          role={membership.role}
        />

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
