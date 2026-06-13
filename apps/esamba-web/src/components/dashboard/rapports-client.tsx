"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertTriangle,
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  Route,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import type {
  RapportDriverPerformance,
  RapportIncidentDetail,
  RapportKpis,
  RapportMonthlyExpense,
  RapportVehicleStat,
} from "@/lib/dashboard/fetch-rapports";
import { canExportReports } from "@/lib/dashboard/roles";
import { cn, formatDate, formatXAF } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface RapportsClientProps {
  fleetName: string;
  userRole: string;
  kpis: RapportKpis;
  vehicleStats: RapportVehicleStat[];
  driverPerformance: RapportDriverPerformance[];
  monthlyExpenses: RapportMonthlyExpense[];
  incidents: RapportIncidentDetail[];
  currentDays: number;
}

const PERIOD_OPTIONS = [
  { value: "7", label: "7 derniers jours" },
  { value: "30", label: "30 derniers jours" },
  { value: "90", label: "90 derniers jours" },
] as const;

const INCIDENT_TYPE_LABELS: Record<string, string> = {
  accident: "Accident",
  breakdown: "Panne",
  theft: "Vol",
  traffic_violation: "Infraction",
  other: "Autre",
};

async function exportToExcel(
  data: Record<string, string | number>[],
  filename: string,
) {
  if (data.length === 0) {
    toast.error("Aucune donnée à exporter");
    return;
  }
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Données");
  XLSX.writeFile(wb, `${filename}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  toast.success("Export Excel téléchargé");
}

function formatVehiclesForExport(vehicleStats: RapportVehicleStat[]) {
  return vehicleStats.map((v) => ({
    Plaque: v.plate_number,
    "Marque/Modèle": `${v.brand ?? ""} ${v.model ?? ""}`.trim(),
    Statut: v.status === "active" ? "Actif" : v.status,
    Kilométrage: v.current_mileage ?? 0,
    Créneaux: v.total_trips,
    "KM totaux": v.total_km,
    "Dépenses (XAF)": v.total_expenses,
    "Docs expirés": v.expired_docs,
    Incidents: v.total_incidents,
  }));
}

function formatDriversForExport(drivers: RapportDriverPerformance[]) {
  return drivers.map((d) => ({
    Nom: d.driver_name,
    Statut: d.status === "active" ? "Actif" : "Inactif",
    Créneaux: d.total_trips,
    "KM totaux": d.total_km,
    "Score sécurité": d.safety_score?.toFixed(1) ?? "—",
    Incidents: d.total_incidents,
    "Dernier créneau": d.last_trip_at
      ? format(new Date(d.last_trip_at), "dd/MM/yyyy", { locale: fr })
      : "—",
  }));
}

function formatExpensesForExport(expenses: RapportMonthlyExpense[]) {
  return expenses.map((e) => ({
    Mois: e.month
      ? format(new Date(e.month), "MMMM yyyy", { locale: fr })
      : "—",
    Catégorie: e.category === "fuel" ? "Carburant" : e.category,
    "Nb enregistrements": e.nb_records,
    "Total (XAF)": e.total_amount,
    "Moyenne (XAF)": Math.round(e.avg_amount),
  }));
}

function exportToPDF() {
  window.print();
}

function incidentTypeLabel(type: string) {
  return INCIDENT_TYPE_LABELS[type] ?? type;
}

function incidentStatusLabel(status: string) {
  if (status === "open" || status === "investigating") return "Ouvert";
  return "Résolu";
}

function isIncidentOpen(status: string) {
  return status === "open" || status === "investigating";
}

export function RapportsClient({
  fleetName,
  userRole,
  kpis,
  vehicleStats,
  driverPerformance,
  monthlyExpenses,
  incidents,
  currentDays,
}: RapportsClientProps) {
  const router = useRouter();
  const canExport = canExportReports(userRole);

  const totalKm = kpis.totalKm;
  const totalExpenses = kpis.fuelTotalXaf;
  const costPerKm = totalKm > 0 ? Math.round(totalExpenses / totalKm) : 0;
  const avgTripDist =
    kpis.shiftCount > 0 ? Math.round(totalKm / kpis.shiftCount) : 0;

  const incidentsByType = incidents.reduce<Record<string, number>>((acc, i) => {
    acc[i.type] = (acc[i.type] ?? 0) + 1;
    return acc;
  }, {});

  const sortedVehicles = [...vehicleStats].sort(
    (a, b) => b.total_km - a.total_km,
  );
  const sortedDrivers = [...driverPerformance].sort(
    (a, b) => b.total_trips - a.total_trips,
  );

  const kpiCards = [
    {
      label: "KM parcourus",
      value: `${Math.round(totalKm).toLocaleString("fr-FR")} km`,
      icon: Route,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Dépenses carburant",
      value: formatXAF(totalExpenses),
      icon: Wallet,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      label: "Coût/km moyen",
      value: `${costPerKm.toLocaleString("fr-FR")} XAF`,
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Créneaux clôturés",
      value: String(kpis.shiftCount),
      icon: BarChart3,
      color: "text-teal-600",
      bg: "bg-teal-50",
    },
    {
      label: "Véhicules actifs",
      value: `${kpis.vehiclesActive}/${kpis.vehicleCount}`,
      icon: Truck,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Conducteurs actifs",
      value: String(kpis.driverCount),
      icon: Users,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      label: "Incidents",
      value: String(kpis.incidentCount),
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "KM moy. / créneau",
      value: `${avgTripDist} km`,
      icon: Route,
      color: "text-muted-foreground",
      bg: "bg-muted",
    },
  ];

  return (
    <div className="space-y-5 print:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-bold">Rapports</h1>
          <p className="text-sm text-muted-foreground">
            {fleetName} · du {formatDate(kpis.periodStart)} au{" "}
            {formatDate(kpis.periodEnd)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={String(currentDays)}
            onValueChange={(value) =>
              router.push(`/dashboard/rapports?days=${value as string}`)
            }
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canExport ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() =>
                  exportToExcel(
                    formatExpensesForExport(monthlyExpenses),
                    "depenses_esamba",
                  )
                }
              >
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                Excel Dépenses
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() =>
                  exportToExcel(
                    formatVehiclesForExport(vehicleStats),
                    "vehicules_esamba",
                  )
                }
              >
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                Excel Véhicules
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() =>
                  exportToExcel(
                    formatDriversForExport(driverPerformance),
                    "conducteurs_esamba",
                  )
                }
              >
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                Excel Conducteurs
              </Button>
              <Button size="sm" className="gap-2" onClick={exportToPDF}>
                <FileText className="h-4 w-4" />
                PDF
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div className="mb-8 hidden print:block">
        <h1 className="text-3xl font-bold">{fleetName}</h1>
        <h2 className="text-xl text-muted-foreground">
          Rapport de flotte ·{" "}
          {format(new Date(), "MMMM yyyy", { locale: fr })}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Généré par E-Samba.com
        </p>
      </div>

      {kpis.avgDriverScore != null ? (
        <p className="text-sm text-muted-foreground print:hidden">
          Score conducteurs moyen :{" "}
          <span className="font-semibold text-foreground">
            {kpis.avgDriverScore.toFixed(1)}/10
          </span>
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpiCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-xl border bg-card p-4"
          >
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                bg,
              )}
            >
              <Icon className={cn("h-5 w-5", color)} />
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="vehicules">
        <TabsList className="h-auto gap-1 rounded-xl border bg-card p-1 print:hidden">
          <TabsTrigger value="vehicules" className="rounded-lg text-sm">
            Véhicules
          </TabsTrigger>
          <TabsTrigger value="conducteurs" className="rounded-lg text-sm">
            Conducteurs
          </TabsTrigger>
          <TabsTrigger value="depenses" className="rounded-lg text-sm">
            Dépenses
          </TabsTrigger>
          <TabsTrigger value="incidents" className="rounded-lg text-sm">
            Incidents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vehicules" className="mt-4">
          <ReportTable
            title="Performance par véhicule"
            emptyMessage="Aucun véhicule sur cette période."
            isEmpty={sortedVehicles.length === 0}
          >
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase text-muted-foreground">
                  Véhicule
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium uppercase text-muted-foreground">
                  Créneaux
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium uppercase text-muted-foreground">
                  KM totaux
                </th>
                <th className="hidden px-4 py-2.5 text-right text-xs font-medium uppercase text-muted-foreground md:table-cell">
                  Dépenses
                </th>
                <th className="hidden px-4 py-2.5 text-right text-xs font-medium uppercase text-muted-foreground lg:table-cell">
                  Incidents
                </th>
                <th className="hidden px-4 py-2.5 text-right text-xs font-medium uppercase text-muted-foreground lg:table-cell">
                  Docs expirés
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedVehicles.slice(0, 15).map((v) => (
                <tr key={v.vehicle_id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{v.plate_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {v.brand} {v.model}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {v.total_trips}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {v.total_km.toLocaleString("fr-FR")} km
                  </td>
                  <td className="hidden px-4 py-3 text-right font-medium text-orange-600 md:table-cell">
                    {formatXAF(v.total_expenses)}
                  </td>
                  <td className="hidden px-4 py-3 text-right lg:table-cell">
                    {v.total_incidents > 0 ? (
                      <span className="font-medium text-destructive">
                        {v.total_incidents}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-right lg:table-cell">
                    {v.expired_docs + v.expiring_docs > 0 ? (
                      <span className="font-medium text-destructive">
                        {v.expired_docs + v.expiring_docs}
                      </span>
                    ) : (
                      <span className="text-green-600">✓</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </ReportTable>
        </TabsContent>

        <TabsContent value="conducteurs" className="mt-4">
          <ReportTable
            title="Performance par conducteur"
            emptyMessage="Aucun conducteur enregistré."
            isEmpty={sortedDrivers.length === 0}
          >
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase text-muted-foreground">
                  Conducteur
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium uppercase text-muted-foreground">
                  Créneaux
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium uppercase text-muted-foreground">
                  KM totaux
                </th>
                <th className="hidden px-4 py-2.5 text-right text-xs font-medium uppercase text-muted-foreground md:table-cell">
                  Score sécu.
                </th>
                <th className="hidden px-4 py-2.5 text-right text-xs font-medium uppercase text-muted-foreground lg:table-cell">
                  Incidents
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedDrivers.slice(0, 15).map((d) => (
                <tr key={d.driver_id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{d.driver_name}</p>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-xs",
                        d.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {d.status === "active" ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {d.total_trips}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {d.total_km.toLocaleString("fr-FR")} km
                  </td>
                  <td className="hidden px-4 py-3 text-right md:table-cell">
                    {d.safety_score != null ? (
                      <span
                        className={cn(
                          "font-bold",
                          d.safety_score >= 8
                            ? "text-green-600"
                            : d.safety_score >= 6
                              ? "text-yellow-600"
                              : "text-destructive",
                        )}
                      >
                        {d.safety_score.toFixed(1)}/10
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-right lg:table-cell">
                    {d.total_incidents > 0 ? (
                      <span className="font-medium text-destructive">
                        {d.total_incidents}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </ReportTable>
        </TabsContent>

        <TabsContent value="depenses" className="mt-4">
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-3">
              <h3 className="text-sm font-semibold">
                Dépenses carburant par mois
              </h3>
              {canExport ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-xs print:hidden"
                  onClick={() =>
                    exportToExcel(
                      formatExpensesForExport(monthlyExpenses),
                      "depenses",
                    )
                  }
                >
                  <Download className="h-3.5 w-3.5" /> Excel
                </Button>
              ) : null}
            </div>
            {monthlyExpenses.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                Aucune dépense carburant sur cette période.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase text-muted-foreground">
                      Mois
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase text-muted-foreground">
                      Catégorie
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium uppercase text-muted-foreground">
                      Nb
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium uppercase text-muted-foreground">
                      Total
                    </th>
                    <th className="hidden px-4 py-2.5 text-right text-xs font-medium uppercase text-muted-foreground md:table-cell">
                      Moyenne
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {monthlyExpenses.slice(0, 20).map((e, i) => (
                    <tr key={`${e.month}-${e.category}-${i}`}>
                      <td className="px-4 py-3 text-muted-foreground">
                        {e.month
                          ? format(new Date(e.month), "MMMM yyyy", {
                              locale: fr,
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {e.category === "fuel" ? "Carburant" : e.category}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {e.nb_records}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatXAF(e.total_amount)}
                      </td>
                      <td className="hidden px-4 py-3 text-right text-muted-foreground md:table-cell">
                        {formatXAF(Math.round(e.avg_amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-muted/40">
                    <td colSpan={3} className="px-4 py-3 font-semibold">
                      TOTAL
                    </td>
                    <td className="px-4 py-3 text-right font-bold">
                      {formatXAF(totalExpenses)}
                    </td>
                    <td className="hidden md:table-cell" />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="incidents" className="mt-4">
          {Object.keys(incidentsByType).length > 0 ? (
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(incidentsByType).map(([type, count]) => (
                <div
                  key={type}
                  className="rounded-xl border bg-card p-4 text-center"
                >
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="mt-1 text-xs text-muted-foreground capitalize">
                    {incidentTypeLabel(type)}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
          <ReportTable
            title="Liste des incidents"
            emptyMessage="Aucun incident sur cette période."
            isEmpty={incidents.length === 0}
          >
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase text-muted-foreground">
                  Date
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase text-muted-foreground">
                  Type
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase text-muted-foreground">
                  Sévérité
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase text-muted-foreground">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {incidents.map((i) => (
                <tr key={i.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {format(new Date(i.occurred_at), "dd/MM/yyyy", {
                      locale: fr,
                    })}
                  </td>
                  <td className="px-4 py-3 font-medium capitalize">
                    {incidentTypeLabel(i.type)}
                  </td>
                  <td className="px-4 py-3">
                    <SeverityBadge severity={i.severity} />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs",
                        isIncidentOpen(i.status)
                          ? "bg-destructive/10 text-destructive"
                          : "bg-green-100 text-green-700",
                      )}
                    >
                      {incidentStatusLabel(i.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </ReportTable>
        </TabsContent>
      </Tabs>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              aside, header, nav, [data-slot="sidebar"] { display: none !important; }
              main { padding: 0 !important; }
              .print\\:hidden { display: none !important; }
              .print\\:block { display: block !important; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; }
            }
          `,
        }}
      />
    </div>
  );
}

function ReportTable({
  title,
  emptyMessage,
  isEmpty,
  children,
}: {
  title: string;
  emptyMessage: string;
  isEmpty: boolean;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="border-b bg-muted/40 px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {isEmpty ? (
        <p className="p-4 text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <table className="w-full text-sm">{children}</table>
      )}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium",
        severity === "critical"
          ? "bg-destructive/10 text-destructive"
          : severity === "high"
            ? "bg-orange-100 text-orange-700"
            : severity === "medium"
              ? "bg-yellow-100 text-yellow-700"
              : "bg-muted text-muted-foreground",
      )}
    >
      {severity === "critical"
        ? "Critique"
        : severity === "high"
          ? "Élevé"
          : severity === "medium"
            ? "Moyen"
            : "Faible"}
    </span>
  );
}
