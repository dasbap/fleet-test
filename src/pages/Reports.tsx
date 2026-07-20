import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useFleetBillingContext } from "@/hooks/useFleetBillingContext";
import { useFleetReport } from "@/hooks/useFleetReport";
import { planValueMessages } from "@/lib/plan-value-messages";
import { toast } from "@/hooks/use-toast";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { RecentIncidentsTable } from "@/components/reports/RecentIncidentsTable";
import { LazyWhenVisible } from "@/components/reports/LazyWhenVisible";
import { VehicleFilter } from "@/components/reports/VehicleFilter";
import {
  FileText,
  Download,
  FileSpreadsheet,
  CalendarIcon,
  TrendingUp,
  Car,
  Users,
  AlertTriangle,
  Wrench,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useActivation } from "@/hooks/useActivation";
import { useRoleAccess } from "@/hooks/useRoleAccess";

const RevenueChart = lazy(() =>
  import("@/components/reports/RevenueChart").then((module) => ({ default: module.RevenueChart }))
);
const KilometersChart = lazy(() =>
  import("@/components/reports/KilometersChart").then((module) => ({ default: module.KilometersChart }))
);
const IncidentsPieChart = lazy(() =>
  import("@/components/reports/IncidentsPieChart").then((module) => ({ default: module.IncidentsPieChart }))
);
const RevenueTimelineChart = lazy(() =>
  import("@/components/reports/RevenueTimelineChart").then((module) => ({
    default: module.RevenueTimelineChart,
  }))
);
const MaintenanceTrendsChart = lazy(() =>
  import("@/components/reports/MaintenanceTrendsChart").then((module) => ({
    default: module.MaintenanceTrendsChart,
  }))
);

export default function Reports() {
  type ExportFormat = "pdf" | "excel";
  const { role, userFleetId } = useAuth();
  const userRole = role || "organizer";
  const { can } = useRoleAccess();
  const canExport = can("report.export");
  const billingQuery = useFleetBillingContext(userFleetId ?? undefined);

  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const [isExcelExporting, setIsExcelExporting] = useState(false);
  const [confirmExportOpen, setConfirmExportOpen] = useState(false);
  const [pendingExportFormat, setPendingExportFormat] = useState<ExportFormat | null>(null);
  const { completeStep, steps } = useActivation();

  const reportQueryEnabled =
    !!userFleetId &&
    (!billingQuery.isPending
      ? billingQuery.isError || (billingQuery.data?.reportsEnabled ?? true)
      : false);

  const { data: report, isLoading, error } = useFleetReport(
    dateRange.from,
    dateRange.to,
    reportQueryEnabled
  );

  useEffect(() => {
    if (!report) return;
    const reportStep = steps.find((step) => step.id === "first_report");
    if (!reportStep?.completed) {
      void completeStep("first_report");
    }
  }, [completeStep, report, steps]);

  // Get unique vehicles from report data
  const availableVehicles = useMemo(() => {
    if (!report) return [];
    const vehiclesSet = new Set<string>();
    report.revenue.byVehicle.forEach(v => vehiclesSet.add(v.registration));
    report.kilometers.byVehicle.forEach(v => vehiclesSet.add(v.registration));
    return Array.from(vehiclesSet).sort();
  }, [report]);

  // Filter data by selected vehicle
  const filteredReport = useMemo(() => {
    if (!report || !selectedVehicle) return report;
    
    return {
      ...report,
      revenue: {
        ...report.revenue,
        byVehicle: report.revenue.byVehicle.filter(v => v.registration === selectedVehicle),
      },
      kilometers: {
        ...report.kilometers,
        byVehicle: report.kilometers.byVehicle.filter(v => v.registration === selectedVehicle),
      },
      incidents: {
        ...report.incidents,
        recent: report.incidents.recent.filter(i => i.vehicle === selectedVehicle),
      },
    };
  }, [report, selectedVehicle]);

  const handleExportPDF = async () => {
    if (!report) return;
    setIsPdfExporting(true);
    try {
      const { generateFleetPDF } = await import("@/lib/generateFleetPDF");
      await generateFleetPDF(report);
    } catch (e) {
      console.error(e);
      toast({
        title: "Export PDF impossible",
        description:
          e instanceof Error ? e.message : "Une erreur est survenue lors de la génération du PDF.",
        variant: "destructive",
      });
    } finally {
      setIsPdfExporting(false);
    }
  };

  const handleExportExcel = async () => {
    if (!report) return;
    setIsExcelExporting(true);
    try {
      const { generateFleetExcel } = await import("@/lib/generateFleetExcel");
      await generateFleetExcel(report);
    } catch (e) {
      console.error(e);
      toast({
        title: "Export Excel impossible",
        description:
          e instanceof Error ? e.message : "Une erreur est survenue lors de la génération du fichier Excel.",
        variant: "destructive",
      });
    } finally {
      setIsExcelExporting(false);
    }
  };

  const requestExport = (format: ExportFormat) => {
    if (!report || isLoading || isPdfExporting || isExcelExporting) return;
    setPendingExportFormat(format);
    setConfirmExportOpen(true);
  };

  const scheduleIdleExport = (task: () => Promise<void>) => {
    const runner = () => {
      void task();
    };

    if ("requestIdleCallback" in window) {
      const requestIdle = (window as Window & {
        requestIdleCallback: (callback: () => void, options?: { timeout: number }) => number;
      }).requestIdleCallback;
      requestIdle(runner, { timeout: 1200 });
      return;
    }

    window.setTimeout(runner, 0);
  };

  const confirmExport = async () => {
    setConfirmExportOpen(false);
    const format = pendingExportFormat;
    setPendingExportFormat(null);
    if (!format) return;

    toast({
      title: `Export ${exportFormatLabel(format)} planifié`,
      description: "Le traitement démarre dès qu’un créneau inactif est disponible.",
    });

    scheduleIdleExport(async () => {
      if (format === "pdf") {
        await handleExportPDF();
        return;
      }
      await handleExportExcel();
    });
  };

  const quickRanges = [
    { label: "7 derniers jours", from: subDays(new Date(), 7), to: new Date() },
    { label: "30 derniers jours", from: subDays(new Date(), 30), to: new Date() },
    { label: "Ce mois", from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
    { label: "Mois dernier", from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) },
  ];

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  if (userFleetId && billingQuery.isPending) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center" aria-busy="true">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (userFleetId && billingQuery.isSuccess && billingQuery.data.reportsEnabled === false) {
    return (
      <div className="mx-auto max-w-lg py-12">
        <Card>
          <CardHeader>
            <CardTitle>{planValueMessages.reports.title}</CardTitle>
            <CardDescription>{planValueMessages.reports.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/dashboard/settings">{planValueMessages.upgradeCta}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-heading font-bold flex items-center gap-2">
                    <FileText className="h-8 w-8" />
                    Rapports
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Analysez les performances de votre flotte
                  </p>
                </div>
                {canExport && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => requestExport("pdf")}
                      disabled={!report || isLoading || isPdfExporting || isExcelExporting}
                      size="lg"
                    >
                      {isPdfExporting ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-5 w-5" />
                      )}
                      {isPdfExporting ? "Préparation du PDF…" : "Télécharger PDF"}
                    </Button>
                    <Button
                      onClick={() => requestExport("excel")}
                      disabled={!report || isLoading || isPdfExporting || isExcelExporting}
                      size="lg"
                      variant="outline"
                    >
                      {isExcelExporting ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      ) : (
                        <FileSpreadsheet className="mr-2 h-5 w-5" />
                      )}
                      {isExcelExporting ? "Préparation Excel…" : "Télécharger Excel"}
                    </Button>
                  </div>
                )}
              </div>

              {/* Date Range Selector & Vehicle Filter */}
              <Card className="animate-fade-in">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <CardTitle className="text-lg">Période du rapport</CardTitle>
                    <VehicleFilter
                      vehicles={availableVehicles}
                      selectedVehicle={selectedVehicle}
                      onSelect={setSelectedVehicle}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {quickRanges.map((range) => (
                      <Button
                        key={range.label}
                        variant={
                          dateRange.from.getTime() === range.from.getTime() &&
                          dateRange.to.getTime() === range.to.getTime()
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => setDateRange({ from: range.from, to: range.to })}
                        className="transition-all duration-200 hover:scale-105"
                      >
                        {range.label}
                      </Button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("justify-start text-left font-normal transition-all duration-200")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(dateRange.from, "dd MMM yyyy", { locale: fr })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 animate-scale-in" align="start">
                        <Calendar
                          mode="single"
                          selected={dateRange.from}
                          onSelect={(date) => date && setDateRange(prev => ({ ...prev, from: date }))}
                          locale={fr}
                        />
                      </PopoverContent>
                    </Popover>
                    <span className="text-muted-foreground">→</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("justify-start text-left font-normal transition-all duration-200")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(dateRange.to, "dd MMM yyyy", { locale: fr })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 animate-scale-in" align="start">
                        <Calendar
                          mode="single"
                          selected={dateRange.to}
                          onSelect={(date) => date && setDateRange(prev => ({ ...prev, to: date }))}
                          locale={fr}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </CardContent>
              </Card>

              {/* Loading State */}
              {isLoading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}

              {/* Error State */}
              {error && (
                <Card className="border-destructive">
                  <CardContent className="pt-6 text-center text-destructive">
                    Erreur lors du chargement des données
                  </CardContent>
                </Card>
              )}

              {/* Report Content */}
              {filteredReport && !isLoading && (
                <>
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="animate-fade-in hover:shadow-lg transition-shadow duration-300">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Revenus validés</p>
                            <p className="text-xl font-bold text-primary">{formatMoney(filteredReport.revenue.validated)}</p>
                          </div>
                          <TrendingUp className="h-8 w-8 text-chart-2" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="animate-fade-in hover:shadow-lg transition-shadow duration-300" style={{ animationDelay: '50ms' }}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Kilomètres</p>
                            <p className="text-xl font-bold">{filteredReport.kilometers.total.toLocaleString('fr-FR')} km</p>
                          </div>
                          <Car className="h-8 w-8 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="animate-fade-in hover:shadow-lg transition-shadow duration-300" style={{ animationDelay: '100ms' }}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Incidents</p>
                            <p className="text-xl font-bold">{filteredReport.incidents.total}</p>
                          </div>
                          <AlertTriangle className="h-8 w-8 text-destructive" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="animate-fade-in hover:shadow-lg transition-shadow duration-300" style={{ animationDelay: '150ms' }}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Maintenances</p>
                            <p className="text-xl font-bold">{filteredReport.maintenance.completed}</p>
                          </div>
                          <Wrench className="h-8 w-8 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Graphiques : chargement différé jusqu’à proximité viewport (recharts) */}
                  <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
                    <LazyWhenVisible fallback={<ChartSkeleton />}>
                      <Suspense fallback={<ChartSkeleton />}>
                        <RevenueTimelineChart
                          closures={filteredReport.timeline}
                          startDate={dateRange.from}
                          endDate={dateRange.to}
                        />
                      </Suspense>
                    </LazyWhenVisible>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="animate-fade-in" style={{ animationDelay: '250ms' }}>
                      <LazyWhenVisible fallback={<ChartSkeleton />}>
                        <Suspense fallback={<ChartSkeleton />}>
                          <RevenueChart data={filteredReport.revenue.byVehicle} />
                        </Suspense>
                      </LazyWhenVisible>
                    </div>
                    <div className="animate-fade-in" style={{ animationDelay: '300ms' }}>
                      <LazyWhenVisible fallback={<ChartSkeleton />}>
                        <Suspense fallback={<ChartSkeleton />}>
                          <KilometersChart data={filteredReport.kilometers.byVehicle} />
                        </Suspense>
                      </LazyWhenVisible>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="animate-fade-in" style={{ animationDelay: '350ms' }}>
                      <LazyWhenVisible fallback={<ChartSkeleton />}>
                        <Suspense fallback={<ChartSkeleton />}>
                          <IncidentsPieChart data={filteredReport.incidents.bySeverity} />
                        </Suspense>
                      </LazyWhenVisible>
                    </div>
                    <div className="animate-fade-in" style={{ animationDelay: '400ms' }}>
                      <LazyWhenVisible fallback={<ChartSkeleton />}>
                        <Suspense fallback={<ChartSkeleton />}>
                          <MaintenanceTrendsChart data={filteredReport.maintenance} />
                        </Suspense>
                      </LazyWhenVisible>
                    </div>
                  </div>

                  {/* Recent Incidents Table */}
                  <div className="animate-fade-in" style={{ animationDelay: '450ms' }}>
                    <RecentIncidentsTable incidents={filteredReport.incidents.recent} />
                  </div>

                  {/* Additional Info */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Performers */}
                    <Card className="animate-fade-in hover:shadow-lg transition-shadow duration-300" style={{ animationDelay: '500ms' }}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Top Chauffeurs
                        </CardTitle>
                        <CardDescription>Par revenus générés</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {filteredReport.drivers.topPerformers.length > 0 ? (
                          <div className="space-y-3">
                            {filteredReport.drivers.topPerformers.map((d, idx) => (
                              <div key={d.name} className="flex items-center justify-between hover:bg-muted/50 p-2 rounded-md transition-colors">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-muted-foreground w-6">{idx + 1}.</span>
                                  <span className="font-medium">{d.name}</span>
                                  <span className="text-xs text-muted-foreground">({d.shifts} créneaux)</span>
                                </div>
                                <span className="font-mono text-sm text-chart-2">{formatMoney(d.revenue)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-center py-4">Aucune donnée</p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Incidents Summary */}
                    <Card className="animate-fade-in hover:shadow-lg transition-shadow duration-300" style={{ animationDelay: '550ms' }}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5" />
                          Incidents
                        </CardTitle>
                        <CardDescription>Répartition par sévérité</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between hover:bg-muted/50 p-2 rounded-md transition-colors">
                            <span className="text-destructive font-medium">Critiques</span>
                            <span className="font-bold">{filteredReport.incidents.bySeverity.critical}</span>
                          </div>
                          <div className="flex items-center justify-between hover:bg-muted/50 p-2 rounded-md transition-colors">
                            <span className="text-destructive/80 font-medium">Élevés</span>
                            <span className="font-bold">{filteredReport.incidents.bySeverity.high}</span>
                          </div>
                          <div className="flex items-center justify-between hover:bg-muted/50 p-2 rounded-md transition-colors">
                            <span className="text-accent-foreground font-medium">Moyens</span>
                            <span className="font-bold">{filteredReport.incidents.bySeverity.medium}</span>
                          </div>
                          <div className="flex items-center justify-between hover:bg-muted/50 p-2 rounded-md transition-colors">
                            <span className="text-muted-foreground font-medium">Faibles</span>
                            <span className="font-bold">{filteredReport.incidents.bySeverity.low}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
      <AlertDialog open={confirmExportOpen} onOpenChange={setConfirmExportOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l’export {exportFormatLabel(pendingExportFormat)}</AlertDialogTitle>
            <AlertDialogDescription>
              L’export charge des librairies lourdes uniquement maintenant, pour limiter la mémoire mobile
              avant action explicite. Continuer l’export ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmExport()}
              disabled={isPdfExporting || isExcelExporting}
            >
              Continuer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function exportFormatLabel(format: "pdf" | "excel" | null) {
  if (format === "pdf") return "PDF";
  if (format === "excel") return "Excel";
  return "fichier";
}

function ChartSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="h-72 animate-pulse rounded-md bg-muted/40" />
      </CardContent>
    </Card>
  );
}
