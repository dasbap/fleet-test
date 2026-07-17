import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Award,
  Car,
  Users,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Phone,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useDriverScores } from "@/hooks/useDriverScores";
import { useFleetActivationMetrics } from "@/hooks/useFleetActivationMetrics";
import { useFleetDriverActivationHealth } from "@/hooks/useFleetDriverActivationHealth";
import { useFleetBillingContext } from "@/hooks/useFleetBillingContext";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

const DashboardStats = () => {
  const { data: stats, isLoading } = useDashboardStats();
  const { userFleetId, role } = useAuth();
  const billingQuery = useFleetBillingContext(userFleetId ?? undefined);
  const allowDriverScores =
    !!userFleetId &&
    (!billingQuery.isPending
      ? billingQuery.isError || (billingQuery.data?.driverScoringEnabled ?? true)
      : false);
  const { data: scores = [] } = useDriverScores(userFleetId ?? undefined, allowDriverScores);
  const { data: activationMetrics, isSuccess: activationLoaded } = useFleetActivationMetrics(
    userFleetId ?? undefined,
  );
  const { data: driverTerrainHealth, isSuccess: terrainHealthLoaded } =
    useFleetDriverActivationHealth(userFleetId ?? undefined);
  const showTerrainHealth =
    terrainHealthLoaded &&
    driverTerrainHealth != null &&
    role !== "driver" &&
    (role === "organizer" || role === "manager" || role === "mechanic");

  const riskyDriversCount = scores.filter(s => s.score_level === 'red').length;
  const scoringUiEnabled =
    billingQuery.isSuccess && (billingQuery.data?.driverScoringEnabled ?? true);

  const statItems = useMemo(() => {
    const items: Array<{
      label: string;
      value: number;
      total?: number;
      suffix?: string | null;
      change?: string | null;
      trend: "up" | "down";
      icon: LucideIcon;
      color: "primary" | "info" | "warning" | "success";
    }> = [
      {
        label: "Véhicules actifs",
        value: stats?.activeVehicles || 0,
        total: stats?.totalVehicles,
        change: stats?.blockedVehicles ? `-${stats.blockedVehicles} bloqués` : null,
        trend: stats?.blockedVehicles && stats.blockedVehicles > 0 ? "down" : "up",
        icon: Car,
        color: "primary",
      },
      {
        label: "Chauffeurs en service",
        value: stats?.activeDrivers || 0,
        total: stats?.totalDrivers,
        change: stats?.totalDrivers ? `sur ${stats.totalDrivers}` : null,
        trend: "up",
        icon: Users,
        color: "info",
      },
      {
        label: "Incidents récents",
        value: stats?.pendingIncidents || 0,
        change: stats?.maintenanceInProgress ? `${stats.maintenanceInProgress} en cours` : null,
        trend: stats?.pendingIncidents && stats.pendingIncidents > 3 ? "down" : "up",
        icon: AlertTriangle,
        color: "warning",
      },
      {
        label: "Recettes du jour",
        value: stats?.todayRevenue ? Math.round(stats.todayRevenue / 1000) : 0,
        suffix: stats?.todayRevenue && stats.todayRevenue >= 1000 ? "K FCFA" : "FCFA",
        change: stats?.pendingClosures ? `${stats.pendingClosures} clôtures en attente` : null,
        trend: "up",
        icon: DollarSign,
        color: "success",
      },
    ];

    if (showTerrainHealth && driverTerrainHealth) {
      items.push({
        label: "Chauffeurs avec téléphone",
        value: driverTerrainHealth.with_phone_count,
        total: driverTerrainHealth.total_drivers,
        change: `${driverTerrainHealth.pct_with_phone} % de la flotte`,
        trend: driverTerrainHealth.pct_with_phone >= 70 ? "up" : "down",
        icon: Phone,
        color: driverTerrainHealth.pct_with_phone >= 70 ? "success" : "warning",
      });
    }

    if (activationLoaded && activationMetrics && scoringUiEnabled) {
      const proofLine =
        activationMetrics.proofSubmissionRate > 0
          ? `Preuves clôture : ${activationMetrics.proofSubmissionRate.toFixed(0)} % (30 j)`
          : null;
      const blockedLine =
        activationMetrics.blockedDriversCount > 0
          ? `Conducteurs désactivés : ${activationMetrics.blockedDriversCount}`
          : null;
      items.push({
        label: "Score moyen conducteurs",
        value: Math.round(activationMetrics.averageDriverScore),
        change: proofLine ?? blockedLine,
        trend: activationMetrics.averageDriverScore >= 60 ? "up" : "down",
        icon: Award,
        color: "info",
      });
    }

    return items;
  }, [
    stats,
    activationMetrics,
    activationLoaded,
    scoringUiEnabled,
    showTerrainHealth,
    driverTerrainHealth,
  ]);

  const gridCols =
    statItems.length >= 5 || riskyDriversCount > 0
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-4 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid gap-4", gridCols)}>
      {statItems.map((stat) => (
        <Card key={stat.label} className="relative overflow-hidden group hover:border-primary/50 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl md:text-3xl font-heading font-bold">
                    {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                  </span>
                  {stat.suffix && (
                    <span className="text-sm text-muted-foreground">{stat.suffix}</span>
                  )}
                  {stat.total && (
                    <span className="text-sm text-muted-foreground">/ {stat.total}</span>
                  )}
                </div>
                {stat.change && (
                  <div className={cn(
                    "flex items-center gap-1 mt-2 text-sm",
                    stat.trend === "up" ? "text-success" : "text-warning-foreground"
                  )}>
                    {stat.trend === "up" ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span>{stat.change}</span>
                  </div>
                )}
              </div>
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                stat.color === "primary" && "bg-primary/10 text-primary",
                stat.color === "info" && "bg-info/10 text-info",
                stat.color === "warning" && "bg-warning/10 text-warning-foreground",
                stat.color === "success" && "bg-success/10 text-success"
              )}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
          {/* Gradient accent */}
          <div className={cn(
            "absolute bottom-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity",
            stat.color === "primary" && "bg-gradient-to-r from-primary to-primary/50",
            stat.color === "info" && "bg-gradient-to-r from-info to-info/50",
            stat.color === "warning" && "bg-gradient-to-r from-warning to-warning/50",
            stat.color === "success" && "bg-gradient-to-r from-success to-success/50"
          )} />
        </Card>
      ))}
    </div>
  );
};

export default DashboardStats;
