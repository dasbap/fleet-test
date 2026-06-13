import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveFleetContext } from "@/lib/dashboard/session";
import {
  defaultReportPeriod,
  fetchRapportsPageData,
} from "@/lib/dashboard/fetch-rapports";
import { RapportsClient } from "@/components/dashboard/rapports-client";

interface RapportsPageProps {
  searchParams: Promise<{ days?: string }>;
}

export default async function RapportsPage({ searchParams }: RapportsPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const context = await resolveFleetContext(supabase);

  if (!context) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    redirect(user ? "/onboarding" : "/connexion");
  }

  const days = Number.parseInt(params.days ?? "30", 10);
  const safeDays = [7, 30, 90].includes(days) ? days : 30;
  const { startISO, endISO } = defaultReportPeriod(safeDays);
  const data = await fetchRapportsPageData(
    supabase,
    context,
    startISO,
    endISO,
  );

  return (
    <RapportsClient
      fleetName={data.fleetName}
      userRole={data.userRole}
      kpis={data.kpis}
      vehicleStats={data.vehicleStats}
      driverPerformance={data.driverPerformance}
      monthlyExpenses={data.monthlyExpenses}
      incidents={data.incidents}
      currentDays={safeDays}
    />
  );
}
