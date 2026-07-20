import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { resolveFleetContext } from "@/lib/dashboard/session";
import { fetchVehiclesPageData } from "@/lib/dashboard/fetch-vehicles";
import { VehiclesTable } from "@/components/dashboard/vehicles-table";

interface SearchParams {
  status?: string;
  fleet?: string;
  q?: string;
}

interface VehiculesPageProps {
  searchParams: Promise<SearchParams>;
}

export default async function VehiculesPage({ searchParams }: VehiculesPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const context = await resolveFleetContext(supabase);

  if (!context) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    redirect(user ? "/onboarding" : "/connexion");
  }

  const { vehicles, fleets, statusCounts } = await fetchVehiclesPageData(
    supabase,
    context,
    params,
  );

  return (
    <VehiclesTable
      vehicles={vehicles}
      fleets={fleets}
      statusCounts={statusCounts}
      userRole={context.role}
      orgId={context.orgId}
      currentFilters={params}
    />
  );
}
