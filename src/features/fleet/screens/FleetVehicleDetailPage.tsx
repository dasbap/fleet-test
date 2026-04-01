import { Link, useParams } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale/fr";
import { ArrowLeft, AlertTriangle, Gauge, History, Share2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { useVehicleDetail } from "@/hooks/useVehicles";
import { useVehicleAlerts } from "@/hooks/useAlerts";
import { buildVehicleHistoryEvents } from "@/features/fleet/lib/vehicleHistory";
import { shareContent, buildVehicleDocumentSharePayload } from "@/services/share.service";
import { toast } from "@/hooks/use-toast";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return format(new Date(value), "d MMM yyyy à HH:mm", { locale: fr });
  } catch {
    return "—";
  }
}

function formatKm(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value);
}

function statusLabel(status: string): string {
  if (status === "ok") return "Actif";
  if (status === "blocked") return "Bloqué";
  return status;
}

function severityLabel(severity: string): string {
  if (severity === "critical") return "Critique";
  if (severity === "high") return "Élevée";
  if (severity === "medium") return "Moyenne";
  if (severity === "low") return "Faible";
  return severity;
}

export default function FleetVehicleDetailPage() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const { data: vehicle, isLoading: isVehicleLoading } = useVehicleDetail(vehicleId);
  const { data: vehicleAlerts = [], isLoading: isAlertsLoading } = useVehicleAlerts(vehicleId);

  if (!vehicleId) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4 pb-24">
        <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
          <Link to={ROUTE_PATHS.dashboardVehicles}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la liste
          </Link>
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Identifiant de véhicule invalide.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isVehicleLoading && !vehicle) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-3 p-4 pb-24">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="h-24 animate-pulse rounded bg-muted" />
        <div className="h-24 animate-pulse rounded bg-muted" />
        <div className="h-24 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4 pb-24">
        <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
          <Link to={ROUTE_PATHS.dashboardVehicles}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la liste
          </Link>
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Véhicule introuvable dans votre flotte.
          </CardContent>
        </Card>
      </div>
    );
  }

  const history = buildVehicleHistoryEvents(vehicle, vehicleAlerts);

  async function handleShare(): Promise<void> {
    const path = ROUTE_PATHS.dashboardVehicleDetail(vehicle.id);
    const payload = buildVehicleDocumentSharePayload(vehicle, vehicleAlerts, path);
    const { outcome } = await shareContent(payload);
    if (outcome === "shared") {
      toast({
        title: "Partage",
        description: "Le document peut être envoyé via le menu système.",
      });
    } else if (outcome === "copied") {
      toast({
        title: "Copié",
        description: "Le résumé a été copié dans le presse-papiers.",
      });
    } else if (outcome === "unavailable") {
      toast({
        title: "Partage indisponible",
        description: "Impossible d’ouvrir le partage sur cet appareil.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4 pb-24">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link to={ROUTE_PATHS.dashboardVehicles} aria-label="Retour aux véhicules">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight">
            {vehicle.registration}
          </h1>
          <p className="text-xs text-muted-foreground">
            {vehicle.brand ?? "Marque inconnue"} · {vehicle.model ?? "Modèle inconnu"}
          </p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => void handleShare()}
            aria-label="Partager la fiche véhicule"
          >
            <Share2 className="h-4 w-4" aria-hidden />
          </Button>
          <Badge
            variant={vehicle.status === "blocked" ? "destructive" : "outline"}
            className="text-xs"
          >
            {statusLabel(vehicle.status)}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge className="h-5 w-5 text-primary" aria-hidden />
            Statut & kilométrage
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Statut</p>
            <p className="mt-0.5 font-medium">{statusLabel(vehicle.status)}</p>
            {vehicle.blocked_reason ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Motif : {vehicle.blocked_reason}
              </p>
            ) : null}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Kilométrage actuel</p>
            <p className="mt-0.5 font-medium">{formatKm(vehicle.current_km)} km</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Conducteur actif</p>
            <p className="mt-0.5 flex items-center gap-1 font-medium">
              <User className="h-4 w-4 text-muted-foreground" aria-hidden />
              {vehicle.active_assignment?.driver?.full_name ?? "Aucun conducteur affecté"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-warning" aria-hidden />
            Alertes liées au véhicule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {isAlertsLoading && vehicleAlerts.length === 0 ? (
            <div className="space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          ) : vehicleAlerts.length === 0 ? (
            <p className="text-muted-foreground">Aucune alerte ouverte pour ce véhicule.</p>
          ) : (
            <ul className="space-y-2">
              {vehicleAlerts.map((alert) => (
                <li
                  key={alert.id}
                  className="rounded-md border border-border/70 bg-muted/20 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[0.7rem] uppercase tracking-wide">
                      {severityLabel(alert.severity)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(alert.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 font-medium">{alert.message}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-5 w-5 text-primary" aria-hidden />
            Historique
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun événement disponible.</p>
          ) : (
            <ul className="space-y-3">
              {history.map((entry) => (
                <li key={entry.id} className="border-l-2 border-border pl-3">
                  <p className="text-xs text-muted-foreground">{formatDate(entry.at)}</p>
                  <p className="text-sm font-medium">{entry.title}</p>
                  {entry.description ? (
                    <p className="text-xs text-muted-foreground">{entry.description}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

