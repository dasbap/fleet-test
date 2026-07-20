// ============================================================
// FICHIER : src/app/dashboard/page.tsx
// Page principale du tableau de bord
// Server Component — toutes les données chargées côté serveur
//
// Schéma prod E-Samba (pas le greenfield anglais) :
//   organization_members → flotte_adhesions + flottes(org_id)
//   get_org_kpis         → calcul direct depuis tables E-Samba
//   v_expiring_documents → vehicle_documents
//   vehicles             → vehicules (ok | blocked)
//   v_monthly_expenses   → journal_carburant (catégorie fuel)
//   trips                → creneaux_conducteurs clôturés
// ============================================================

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { KpiGrid } from "@/components/dashboard/kpi-cards";
import { AlertsList, type ExpiringDoc } from "@/components/dashboard/alerts-list";
import { resolveFleetContext } from "@/lib/dashboard/session";
import { fetchExpiringDocs } from "@/lib/dashboard/fetch-expiring-docs";
import { fetchShiftKmRows, type ShiftKmRow } from "@/lib/dashboard/fetch-shift-km";
import {
  ExpensesBarChart,
  VehicleStatusChart,
  KmLineChart,
} from "@/components/dashboard/charts";
import { format, subMonths, startOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { mapSnapshotToDashboardKpis } from "@/lib/dashboard/map-snapshot";
import type { DashboardKpis } from "@/lib/dashboard/types";

interface MonthlyExpenseRow {
  month: string;
  category: string;
  total_amount: number;
}

interface VehicleStatusRow {
  status: string;
}

interface SimpleIdRow {
  id: string;
}

interface DashboardAlertSeverityRow {
  severity: string | null;
}

// Données de démo pour les graphiques si pas encore de données en BDD
function buildEmptyChartData() {
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), 5 - i);
    return format(startOfMonth(d), "MMM yy", { locale: fr });
  });

  return {
    expenses: months.map((month) => ({
      month,
      carburant: 0,
      entretien: 0,
      assurance: 0,
      autres: 0,
      montant: 0,
    })),
    km: months.map((month) => ({ month, km: 0, trajets: 0 })),
  };
}

// Transformer les données dépenses Supabase en format Recharts
function buildExpensesChartData(rawExpenses: MonthlyExpenseRow[]) {
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), 5 - i);
    return {
      key: format(startOfMonth(d), "yyyy-MM"),
      label: format(startOfMonth(d), "MMM yy", { locale: fr }),
    };
  });

  return months.map(({ key, label }) => {
    const monthExpenses = rawExpenses.filter((e) => e.month?.startsWith(key));
    const byCategory = (cat: string) =>
      monthExpenses
        .filter((e) => e.category === cat)
        .reduce((s, e) => s + Number(e.total_amount), 0);

    return {
      month: label,
      carburant: byCategory("fuel"),
      entretien:
        byCategory("maintenance") +
        byCategory("spare_parts") +
        byCategory("tires"),
      assurance: byCategory("insurance"),
      autres: monthExpenses
        .filter(
          (e) =>
            !["fuel", "maintenance", "insurance", "spare_parts", "tires"].includes(
              e.category,
            ),
        )
        .reduce((s, e) => s + Number(e.total_amount), 0),
      montant: monthExpenses.reduce(
        (s, e) => s + Number(e.total_amount),
        0,
      ),
    };
  });
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const context = await resolveFleetContext(supabase);

  if (!context) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    redirect(user ? "/onboarding" : "/connexion");
    throw new Error("Contexte flotte introuvable");
  }

  const { fleetId, orgId } = context;

  const sixMonthsAgo = subMonths(new Date(), 6).toISOString();
  const thirtyDaysAhead = new Date();
  thirtyDaysAhead.setDate(thirtyDaysAhead.getDate() + 30);

  // Toutes les requêtes en parallèle pour minimiser la latence
  const [
    vehicleStatusResult,
    shiftRows,
    driversResult,
    assignmentsResult,
    maintenanceResult,
    alertsResult,
  ] =
    await Promise.all([
      supabase.from("vehicules").select("status").eq("fleet_id", fleetId),

      fetchShiftKmRows(supabase, fleetId, sixMonthsAgo),

      supabase
        .from("flotte_adhesions")
        .select("user_id")
        .eq("fleet_id", fleetId)
        .eq("role", "driver")
        .eq("is_active", true),

      supabase
        .from("affectations_vehicules")
        .select("id")
        .eq("fleet_id", fleetId)
        .eq("is_active", true),

      supabase
        .from("travaux_maintenance")
        .select("id")
        .eq("fleet_id", fleetId)
        .eq("status", "in_progress"),

      supabase
        .from("alertes_automatiques")
        .select("severity")
        .eq("fleet_id", fleetId)
        .eq("resolved", false),
    ]);

  const expiringDocs: ExpiringDoc[] = (
    await fetchExpiringDocs(
      supabase,
      fleetId,
      thirtyDaysAhead.toISOString(),
    )
  ).sort((a, b) => a.days_remaining - b.days_remaining);

  const expiredDocs = expiringDocs.filter((d) => d.days_remaining < 0).length;
  const expiringDocs30d = expiringDocs.filter(
    (d) => d.days_remaining >= 0 && d.days_remaining <= 30,
  ).length;

  const fuelRows: Array<{ purchased_at: string; amount_xof: number | null }> = [];
  const typedShiftRows = shiftRows as ShiftKmRow[];
  const monthKeyNow = format(startOfMonth(new Date()), "yyyy-MM");

  const expensesThisMonth = fuelRows
    .filter((row) => row.purchased_at.startsWith(monthKeyNow))
    .reduce((s, row) => s + Number(row.amount_xof ?? 0), 0);

  const kmThisMonth = Math.round(
    typedShiftRows
      .filter((row) => row.ended_at?.startsWith(monthKeyNow))
      .reduce((s, row) => {
        const end = row.km_end ?? row.km_start;
        return s + Math.max(0, end - row.km_start);
      }, 0),
  );

  const vehicles = (vehicleStatusResult.data ?? []) as VehicleStatusRow[];
  const maintenanceRows = (maintenanceResult.data ?? []) as SimpleIdRow[];
  const assignmentRows = (assignmentsResult.data ?? []) as SimpleIdRow[];
  const driverRows = (driversResult.data ?? []) as Array<{ user_id: string }>;
  const alertRows = (alertsResult.data ?? []) as DashboardAlertSeverityRow[];
  const maintenanceCount = maintenanceRows.length;
  const criticalAlerts =
    alertRows.filter((alert) => alert.severity === "critical").length;
  const snapshot = {
    stats: {
      activeVehicles: vehicles.filter((v) => v.status === "ok").length,
      totalVehicles: vehicles.length,
      activeDrivers: assignmentRows.length,
      totalDrivers: driverRows.length,
      maintenanceInProgress: maintenanceCount,
    },
    kpis: {
      criticalAlerts,
    },
  };

  const kpis: DashboardKpis = mapSnapshotToDashboardKpis({
    stats: snapshot.stats,
    kpis: snapshot.kpis,
    expiredDocs,
    expiringDocs30d,
    expensesThisMonth,
    kmThisMonth,
  });

  const vehicleStats = {
    active: vehicles.filter((v) => v.status === "ok").length,
    maintenance: maintenanceCount,
    inactive: vehicles.filter((v) => v.status === "blocked").length,
    sold: 0,
  };

  const rawExpenses: MonthlyExpenseRow[] = fuelRows.map((row) => ({
    month: row.purchased_at,
    category: "fuel",
    total_amount: Number(row.amount_xof ?? 0),
  }));

  const expensesChartData = rawExpenses.length
    ? buildExpensesChartData(rawExpenses)
    : buildEmptyChartData().expenses;

  const tripsData = typedShiftRows.map((row) => ({
    started_at: row.ended_at,
    distance_km: Math.max(0, (row.km_end ?? row.km_start) - row.km_start),
  }));

  const kmChartData = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), 5 - i);
    const monthKey = format(startOfMonth(d), "yyyy-MM");
    const monthTrips = tripsData.filter((t) => t.started_at?.startsWith(monthKey));
    return {
      month: format(startOfMonth(d), "MMM yy", { locale: fr }),
      km: Math.round(
        monthTrips.reduce((s, t) => s + Number(t.distance_km ?? 0), 0),
      ),
      trajets: monthTrips.length,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Tableau de bord</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
        </p>
      </div>

      <KpiGrid kpis={kpis} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ExpensesBarChart data={expensesChartData} />
        </div>
        <div>
          <VehicleStatusChart
            active={vehicleStats.active}
            maintenance={vehicleStats.maintenance}
            inactive={vehicleStats.inactive}
            sold={vehicleStats.sold}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <KmLineChart data={kmChartData} />
        </div>
        <div className="lg:col-span-3">
          <AlertsList docs={expiringDocs} />
        </div>
      </div>
    </div>
  );
}
