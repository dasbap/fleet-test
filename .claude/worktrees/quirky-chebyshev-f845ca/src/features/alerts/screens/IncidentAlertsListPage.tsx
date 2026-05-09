import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, Bell, Car, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageLoader } from "@/components/dashboard/PageLoader";
import { useAuth } from "@/hooks/useAuth";
import { useFleetBillingContext } from "@/hooks/useFleetBillingContext";
import { planValueMessages } from "@/lib/plan-value-messages";
import { useIncidentAlerts } from "@/features/alerts/hooks/useIncidentAlerts";
import {
  filterIncidentAlerts,
  sortIncidentAlertsByPriority,
} from "@/features/alerts/lib/filterAndSortIncidentAlerts";
import type {
  IncidentSeverityFilter,
  IncidentStatusFilter,
} from "@/types/incident-alert";
import { IncidentAlertCard } from "@/features/alerts/components/IncidentAlertCard";

const SEVERITY_FILTERS: { id: IncidentSeverityFilter; label: string }[] = [
  { id: "all", label: "Toutes gravités" },
  { id: "critique", label: "Critique" },
  { id: "haute", label: "Haute" },
  { id: "moyenne", label: "Moyenne" },
  { id: "basse", label: "Basse" },
];

const STATUS_FILTERS: { id: IncidentStatusFilter; label: string }[] = [
  { id: "all", label: "Tous statuts" },
  { id: "NOUVEAU", label: "Nouveau" },
  { id: "EN_COURS", label: "En cours" },
  { id: "RESOLU", label: "Résolu" },
];

/**
 * Boîte d’incidents priorisée — liste filtrable (données mock + store session).
 */
export default function IncidentAlertsListPage() {
  const { userFleetId, isLoading: authLoading } = useAuth();
  const billingQuery = useFleetBillingContext(userFleetId ?? undefined);
  const navigate = useNavigate();
  const { data: raw = [], isLoading: alertsLoading } = useIncidentAlerts(userFleetId ?? undefined);
  const [severity, setSeverity] = useState<IncidentSeverityFilter>("all");
  const [status, setStatus] = useState<IncidentStatusFilter>("all");

  const filtered = useMemo(
    () =>
      sortIncidentAlertsByPriority(
        filterIncidentAlerts(raw, severity, status)
      ),
    [raw, severity, status]
  );

  const showAnomalyPlanUpsell =
    !!userFleetId &&
    billingQuery.isSuccess &&
    billingQuery.data.anomalyInsightsEnabled === false;

  if (authLoading || alertsLoading) {
    return <PageLoader />;
  }

  if (!userFleetId) {
    return (
      <div className="mx-auto max-w-7xl">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Bell className="mb-4 h-16 w-16 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">Aucune flotte</h3>
            <p className="mb-4 text-muted-foreground">
              Rejoignez une flotte pour suivre les alertes opérationnelles.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate("/dashboard")}>
                Tableau de bord
              </Button>
              <Button onClick={() => navigate("/dashboard/create-fleet")}>
                Créer une flotte
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-0 sm:space-y-6 lg:max-w-7xl">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-heading flex items-center gap-2.5 text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">
            <AlertTriangle className="h-7 w-7 shrink-0 text-warning sm:h-8 sm:w-8" aria-hidden />
            <span>Alertes & incidents</span>
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Gravité, statut et responsables — priorisation opérationnelle
          </p>
        </div>
      </div>

      {showAnomalyPlanUpsell && (
        <Alert className="border-info/40 bg-info/5">
          <Info className="h-4 w-4" />
          <AlertTitle>{planValueMessages.anomalyInsights.title}</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{planValueMessages.anomalyInsights.description}</span>
            <Button asChild size="sm" variant="secondary" className="shrink-0">
              <Link to="/dashboard/settings">{planValueMessages.upgradeCta}</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          Gravité
        </p>
        <div className="flex flex-wrap gap-2">
          {SEVERITY_FILTERS.map(({ id, label }) => (
            <Button
              key={id}
              type="button"
              size="sm"
              variant={severity === id ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setSeverity(id)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          Statut
        </p>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map(({ id, label }) => (
            <Button
              key={id}
              type="button"
              size="sm"
              variant={status === id ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setStatus(id)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
            <Car className="h-10 w-10 opacity-50" />
            Aucune alerte ne correspond à ces filtres.
          </CardContent>
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
          {filtered.map((a) => (
            <li key={a.id}>
              <IncidentAlertCard alert={a} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
