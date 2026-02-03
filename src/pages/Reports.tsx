import { useState } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/useAuth";
import { useFleetReport } from "@/hooks/useFleetReport";
import { generateFleetPDF } from "@/lib/generateFleetPDF";
import { generateFleetExcel } from "@/lib/generateFleetExcel";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { RevenueChart } from "@/components/reports/RevenueChart";
import { KilometersChart } from "@/components/reports/KilometersChart";
import { IncidentsPieChart } from "@/components/reports/IncidentsPieChart";
import { RevenueTimelineChart } from "@/components/reports/RevenueTimelineChart";
import { MaintenanceTrendsChart } from "@/components/reports/MaintenanceTrendsChart";
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

export default function Reports() {
  const { role } = useAuth();
  const userRole = role || "organizer";
  
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const { data: report, isLoading, error } = useFleetReport(dateRange.from, dateRange.to);

  const handleExportPDF = () => {
    if (report) {
      generateFleetPDF(report);
    }
  };

  const handleExportExcel = () => {
    if (report) {
      generateFleetExcel(report);
    }
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

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar userRole={userRole} />
        <SidebarInset className="flex flex-col flex-1">
          <DashboardHeader userRole={userRole} />
          <main className="flex-1 p-6 overflow-auto">
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
                <div className="flex gap-2">
                  <Button 
                    onClick={handleExportPDF} 
                    disabled={!report || isLoading}
                    size="lg"
                  >
                    <Download className="mr-2 h-5 w-5" />
                    PDF
                  </Button>
                  <Button 
                    onClick={handleExportExcel} 
                    disabled={!report || isLoading}
                    size="lg"
                    variant="outline"
                  >
                    <FileSpreadsheet className="mr-2 h-5 w-5" />
                    Excel
                  </Button>
                </div>
              </div>

              {/* Date Range Selector */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Période du rapport</CardTitle>
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
                      >
                        {range.label}
                      </Button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("justify-start text-left font-normal")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(dateRange.from, "dd MMM yyyy", { locale: fr })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
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
                        <Button variant="outline" className={cn("justify-start text-left font-normal")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(dateRange.to, "dd MMM yyyy", { locale: fr })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
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
              {report && !isLoading && (
                <>
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Revenus validés</p>
                            <p className="text-xl font-bold text-primary">{formatMoney(report.revenue.validated)}</p>
                          </div>
                          <TrendingUp className="h-8 w-8 text-chart-2" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Kilomètres</p>
                            <p className="text-xl font-bold">{report.kilometers.total.toLocaleString('fr-FR')} km</p>
                          </div>
                          <Car className="h-8 w-8 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Incidents</p>
                            <p className="text-xl font-bold">{report.incidents.total}</p>
                          </div>
                          <AlertTriangle className="h-8 w-8 text-destructive" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Maintenances</p>
                            <p className="text-xl font-bold">{report.maintenance.completed}</p>
                          </div>
                          <Wrench className="h-8 w-8 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Revenue Timeline Chart */}
                  <RevenueTimelineChart 
                    closures={report.timeline} 
                    startDate={dateRange.from} 
                    endDate={dateRange.to} 
                  />

                  {/* Interactive Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <RevenueChart data={report.revenue.byVehicle} />
                    <KilometersChart data={report.kilometers.byVehicle} />
                  </div>

                  {/* Detailed Cards */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Incidents Pie Chart */}
                    <IncidentsPieChart data={report.incidents.bySeverity} />

                    {/* Maintenance Trends Chart */}
                    <MaintenanceTrendsChart data={report.maintenance} />
                  </div>

                  {/* Additional Info */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Performers */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Top Chauffeurs
                        </CardTitle>
                        <CardDescription>Par revenus générés</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {report.drivers.topPerformers.length > 0 ? (
                          <div className="space-y-3">
                            {report.drivers.topPerformers.map((d, idx) => (
                              <div key={d.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-muted-foreground w-6">{idx + 1}.</span>
                                  <span className="font-medium">{d.name}</span>
                                  <span className="text-xs text-muted-foreground">({d.shifts} shifts)</span>
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
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5" />
                          Incidents
                        </CardTitle>
                        <CardDescription>Répartition par sévérité</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-destructive font-medium">Critiques</span>
                            <span className="font-bold">{report.incidents.bySeverity.critical}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-destructive/80 font-medium">Élevés</span>
                            <span className="font-bold">{report.incidents.bySeverity.high}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-accent-foreground font-medium">Moyens</span>
                            <span className="font-bold">{report.incidents.bySeverity.medium}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground font-medium">Faibles</span>
                            <span className="font-bold">{report.incidents.bySeverity.low}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
