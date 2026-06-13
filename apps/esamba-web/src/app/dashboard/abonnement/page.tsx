import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { resolveFleetContext } from "@/lib/dashboard/session";
import { fetchAbonnementPageData } from "@/lib/dashboard/fetch-billing";
import { AbonnementClient } from "@/components/dashboard/abonnement-client";

export default async function AbonnementPage() {
  const supabase = await createClient();
  const context = await resolveFleetContext(supabase);

  if (!context) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    redirect(user ? "/onboarding" : "/connexion");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const data = await fetchAbonnementPageData(supabase, context);

  return (
    <AbonnementClient
      org={data.org}
      billingContext={data.billingContext}
      currentSub={data.currentSub}
      transactions={data.transactions}
      plans={data.plans}
      usage={data.usage}
      userRole={context.role}
      userEmail={user?.email ?? ""}
    />
  );
}
