import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveFleetContext } from "@/lib/dashboard/session";
import {
  computeDriverStatusCounts,
  fetchDriversPageData,
} from "@/lib/dashboard/fetch-drivers";
import { DriversTable } from "@/components/dashboard/drivers-table";

export default async function ConducteursPage() {
  const supabase = await createClient();
  const context = await resolveFleetContext(supabase);

  if (!context) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    redirect(user ? "/onboarding" : "/connexion");
  }

  const drivers = await fetchDriversPageData(supabase, context);
  const statusCounts = computeDriverStatusCounts(drivers);

  return (
    <DriversTable
      drivers={drivers}
      statusCounts={statusCounts}
      userRole={context.role}
      fleetId={context.fleetId}
    />
  );
}
