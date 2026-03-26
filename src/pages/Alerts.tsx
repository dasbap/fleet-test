import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Car,
  User,
  Calendar,
  Filter,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAlerts, useGenerateAlerts, useResolveAlert, type Alert } from "@/hooks/useAlerts";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Types pour labels et icônes (alignés sur le schéma alert_type / severity)
type AlertType = "missing_closure" | "recurring_gap" | "risky_driver" | "vehicle_blocked";
type SeverityType = "critical" | "high" | "medium" | "low";

const alertTypeLabels: Record<AlertType, string> = {
  missing_closure: "Clôture manquante",
  recurring_gap: "Écart récurrent",
  risky_driver: "Chauffeur à risque",
  vehicle_blocked: "Véhicule bloqué",
};

const severityLabels: Record<SeverityType, string> = {
  critical: "Critique",
  high: "Élevée",
  medium: "Moyenne",
  low: "Faible",
};

const getAlertTypeIcon = (type: AlertType) => {
  switch (type) {
    case "missing_closure":
      return <Calendar className="h-4 w-4" />;
    case "recurring_gap":
      return <AlertTriangle className="h-4 w-4" />;
    case "risky_driver":
      return <User className="h-4 w-4" />;
    case "vehicle_blocked":
      return <Car className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
};

const getSeverityColor = (severity: SeverityType) => {
  switch (severity) {
    case "critical":
    case "high":
      return "destructive";
    case "medium":
      return "default";
    case "low":
      return "secondary";
    default:
      return "default";
  }
};

const Alerts = () => {
  const { role, user } = useAuth();
  const userRole = role ?? "organizer";
  const { data: alerts = [], isLoading } = useAlerts();
  const generateAlerts = useGenerateAlerts();
  const resolveAlert = useResolveAlert();

  const [filterType, setFilterType] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert: Alert) => {
      if (filterType !== "all" && alert.alert_type !== filterType) return false;
      if (filterSeverity !== "all" && alert.severity !== filterSeverity) return false;
      return true;
    });
  }, [alerts, filterType, filterSeverity]);

  const handleGenerateAlerts = useCallback(async () => {
    try {
      const count = await generateAlerts.mutateAsync(undefined);
      toast({
        title: "Alertes générées",
        description: `${count} nouvelle(s) alerte(s) générée(s).`,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Impossible de générer les alertes.";
      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      });
    }
  }, [generateAlerts]);

  const handleResolveAlert = useCallback(
    async (alertId: string) => {
      if (!user?.id) return;
      setResolvingId(alertId);
      try {
        await resolveAlert.mutateAsync({ alertId, resolvedBy: user.id });
        toast({
          title: "Alerte résolue",
          description: "L'alerte a été marquée comme résolue.",
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Impossible de résoudre l'alerte.";
        toast({
          title: "Erreur",
          description: message,
          variant: "destructive",
        });
      } finally {
        setResolvingId(null);
      }
    },
    [user, resolveAlert]
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl md:text-3xl font-heading font-bold flex items-center gap-2">
                    <Bell className="h-7 w-7" />
                    Alertes
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Consultez les alertes et notifications de votre flotte
                  </p>
                </div>
                <Button
                  onClick={handleGenerateAlerts}
                  disabled={generateAlerts.isPending}
                  variant="outline"
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${generateAlerts.isPending ? "animate-spin" : ""}`}
                  />
                  Générer les alertes
                </Button>
              </div>

              {/* Filtres */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filtres
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-sm font-medium mb-2 block">
                        Type d'alerte
                      </label>
                      <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Tous les types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les types</SelectItem>
                          <SelectItem value="missing_closure">Clôture manquante</SelectItem>
                          <SelectItem value="recurring_gap">Écart récurrent</SelectItem>
                          <SelectItem value="risky_driver">Chauffeur à risque</SelectItem>
                          <SelectItem value="vehicle_blocked">Véhicule bloqué</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <label className="text-sm font-medium mb-2 block">
                        Sévérité
                      </label>
                      <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                        <SelectTrigger>
                          <SelectValue placeholder="Toutes les sévérités" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes les sévérités</SelectItem>
                          <SelectItem value="critical">Critique</SelectItem>
                          <SelectItem value="high">Élevée</SelectItem>
                          <SelectItem value="medium">Moyenne</SelectItem>
                          <SelectItem value="low">Faible</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Liste des alertes */}
              <Card>
                <CardHeader>
                  <CardTitle>Alertes actives</CardTitle>
                  <CardDescription>
                    {filteredAlerts.length} alerte(s) non résolue(s)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredAlerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">Aucune alerte</h3>
                      <p className="text-muted-foreground">
                        {alerts.length === 0
                          ? "Aucune alerte active pour le moment."
                          : "Aucune alerte ne correspond aux filtres sélectionnés."}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredAlerts.map((alert: Alert) => (
                        <Card key={alert.id} className="border-l-4 border-l-primary">
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  {getAlertTypeIcon(alert.alert_type)}
                                  <h3 className="font-semibold">
                                    {alertTypeLabels[alert.alert_type] || alert.alert_type}
                                  </h3>
                                  <Badge variant={getSeverityColor(alert.severity)}>
                                    {severityLabels[alert.severity] || alert.severity}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-3">
                                  {alert.message}
                                </p>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span>
                                    {new Date(alert.created_at).toLocaleDateString("fr-FR", {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleResolveAlert(alert.id)}
                                disabled={resolvingId === alert.id}
                              >
                                {resolvingId === alert.id ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Résoudre
                                  </>
                                )}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
    </div>
  );
};

export default Alerts;
