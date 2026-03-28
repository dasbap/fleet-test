import { Link, useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale/fr";
import {
  ArrowLeft,
  Bell,
  Car,
  FileWarning,
  MapPin,
  User,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { getMockFleetVehicleById } from "@/features/fleet/data/mockFleetVehicles";
import { VehicleStatusBadge } from "@/features/fleet/components/VehicleStatusBadge";
import { VehicleTimeline } from "@/features/fleet/components/VehicleTimeline";
import { cn } from "@/lib/utils";

function fmtDate(iso: string) {
  try {
    return format(new Date(iso), "d MMMM yyyy", { locale: fr });
  } catch {
    return "—";
  }
}

function fmtDateTime(iso: string) {
  try {
    return format(new Date(iso), "d MMM yyyy à HH:mm", { locale: fr });
  } catch {
    return "—";
  }
}

/**
 * Fiche véhicule (données mock — même jeu que la liste).
 */
export default function FleetVehicleDetailPage() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const navigate = useNavigate();
  const vehicle = getMockFleetVehicleById(vehicleId);

  if (!vehicle) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to={ROUTE_PATHS.dashboardVehicles}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la liste
          </Link>
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Véhicule introuvable (identifiant inconnu ou hors démo).
          </CardContent>
        </Card>
      </div>
    );
  }

  const maintenanceSorted = [...vehicle.maintenanceHistory].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const docsSorted = [...vehicle.documentsExpiringSoon].sort(
    (a, b) =>
      new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Retour"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-heading text-xl font-bold md:text-2xl">
          Fiche véhicule
        </h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start gap-4 space-y-0">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Car className="h-7 w-7 text-primary" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="font-heading text-lg md:text-xl">
                {vehicle.brand} {vehicle.model}
              </CardTitle>
              <VehicleStatusBadge availability={vehicle.availability} />
            </div>
            <p className="font-mono text-lg font-semibold tracking-tight">
              {vehicle.registration}
            </p>
            <p className="text-muted-foreground text-sm">
              {vehicle.vehicleType}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground text-xs">Kilométrage</p>
              <p className="font-semibold tabular-nums">
                {vehicle.currentKm.toLocaleString("fr-FR")} km
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Prochain entretien</p>
              <p className="font-semibold">{fmtDate(vehicle.nextMaintenanceAt)}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-muted-foreground text-xs flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                Localisation
              </p>
              <p className="font-medium">{vehicle.locationLabel}</p>
              <p className="text-muted-foreground text-xs mt-1">
                Mis à jour : {fmtDateTime(vehicle.locationUpdatedAt)}
              </p>
            </div>
            <div className="sm:col-span-2 flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
              <Bell
                className={cn(
                  "h-4 w-4",
                  vehicle.openAlertsCount > 0 ? "text-warning" : "text-muted-foreground"
                )}
                aria-hidden
              />
              <span className="text-sm font-medium">Alertes ouvertes</span>
              <span
                className={cn(
                  "ml-auto tabular-nums font-semibold",
                  vehicle.openAlertsCount > 0 && "text-warning"
                )}
              >
                {vehicle.openAlertsCount}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-5 w-5 text-primary" aria-hidden />
            Conducteur affecté
          </CardTitle>
        </CardHeader>
        <CardContent>
          {vehicle.assignedDriver ? (
            <div className="space-y-1">
              <p className="font-medium">{vehicle.assignedDriver.fullName}</p>
              {vehicle.assignedDriver.phone && (
                <p className="text-muted-foreground text-sm">
                  {vehicle.assignedDriver.phone}
                </p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Aucun conducteur assigné</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileWarning className="h-5 w-5 text-warning" aria-hidden />
            Documents expirant bientôt
          </CardTitle>
        </CardHeader>
        <CardContent>
          {docsSorted.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Aucun document dans la fenêtre de surveillance.
            </p>
          ) : (
            <ul className="space-y-2">
              {docsSorted.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{d.label}</span>
                  <span className="text-muted-foreground">
                    Exp. {fmtDate(d.expiryDate)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wrench className="h-5 w-5 text-primary" aria-hidden />
            Historique d’entretien
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {maintenanceSorted.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucune entrée.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Intervention</TableHead>
                  <TableHead className="text-right">Km</TableHead>
                  <TableHead>Prestataire</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {maintenanceSorted.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap">
                      {fmtDate(row.date)}
                    </TableCell>
                    <TableCell>{row.label}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.km.toLocaleString("fr-FR")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.provider ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timeline des événements</CardTitle>
        </CardHeader>
        <CardContent>
          <VehicleTimeline events={vehicle.timeline} />
        </CardContent>
      </Card>

      <Separator className="opacity-50" />

      <div className="flex justify-center pb-4">
        <Button variant="outline" asChild>
          <Link to={ROUTE_PATHS.dashboardVehicles}>Retour à la liste</Link>
        </Button>
      </div>
    </div>
  );
}
