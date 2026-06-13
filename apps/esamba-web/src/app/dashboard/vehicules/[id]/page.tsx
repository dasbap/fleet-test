import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveFleetContext } from "@/lib/dashboard/session";
import { fetchVehicleDetail } from "@/lib/dashboard/fetch-vehicle-detail";
import { VehicleDetail } from "@/components/dashboard/vehicle-detail";

interface VehicleDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function VehicleDetailPage({
  params,
}: VehicleDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const context = await resolveFleetContext(supabase);

  if (!context) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    redirect(user ? "/onboarding" : "/connexion");
  }

  const vehicle = await fetchVehicleDetail(supabase, context, id);
  if (!vehicle) {
    notFound();
  }

  return (
    <VehicleDetail
      vehicle={vehicle}
      fleetId={context.fleetId}
      userRole={context.role}
    />
  );
}
