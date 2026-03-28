import { useEffect, useRef } from "react";
import { Crosshair, Loader2, MapPin, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useGeolocation } from "@/hooks/useGeolocation";
import type { GeoPositionSnapshot } from "@/types/geolocation";
import { cn } from "@/lib/utils";

interface GeolocationCoordinatesCardProps {
  /** Quand vrai, tente une capture au premier affichage (ex. ouverture du dialogue). */
  syncOnOpen?: boolean;
  /** Contrôle la synchronisation au montage (ex. lié à `open` d’un dialog). */
  active?: boolean;
  /** Notifie le parent pour préremplir le formulaire (signalement terrain). */
  onCoordinatesChange?: (coords: GeoPositionSnapshot | null) => void;
  className?: string;
}

function formatCoord(n: number) {
  return n.toFixed(6);
}

function permissionLabel(
  p: ReturnType<typeof useGeolocation>["permission"]
): { text: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  switch (p) {
    case "granted":
      return { text: "Autorisée", variant: "default" };
    case "denied":
      return { text: "Refusée", variant: "destructive" };
    case "prompt":
      return { text: "À définir", variant: "secondary" };
    default:
      return { text: "Inconnue", variant: "outline" };
  }
}

/**
 * Affiche lat/long, précision, permission et dernière position connue (session).
 */
export function GeolocationCoordinatesCard({
  syncOnOpen,
  active = true,
  onCoordinatesChange,
  className,
}: GeolocationCoordinatesCardProps) {
  const geo = useGeolocation();
  const didSyncRef = useRef(false);

  useEffect(() => {
    if (!active || !syncOnOpen || didSyncRef.current) return;
    didSyncRef.current = true;
    void geo.refreshPosition();
  }, [active, syncOnOpen, geo]);

  useEffect(() => {
    if (!active) didSyncRef.current = false;
  }, [active]);

  useEffect(() => {
    const p = geo.position ?? geo.lastKnownPosition;
    onCoordinatesChange?.(p ?? null);
  }, [geo.position, geo.lastKnownPosition, onCoordinatesChange]);

  const perm = permissionLabel(geo.permission);
  const display = geo.position ?? geo.lastKnownPosition;

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base font-heading">
            <MapPin className="h-5 w-5 text-primary" aria-hidden />
            Position terrain
          </CardTitle>
          <Badge variant={perm.variant}>{perm.text}</Badge>
        </div>
        <p className="text-muted-foreground text-xs">
          Confirmez la présence et rattachez l’incident au lieu du signalement.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {geo.error && (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Localisation</AlertTitle>
            <AlertDescription>{geo.error}</AlertDescription>
          </Alert>
        )}

        <div className="bg-muted/40 rounded-lg border border-border/60 p-3 font-mono text-sm">
          {geo.isLoading && !display ? (
            <div className="text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Lecture de la position…
            </div>
          ) : display ? (
            <dl className="grid gap-1 sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground text-xs">Latitude</dt>
                <dd>{formatCoord(display.latitude)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Longitude</dt>
                <dd>{formatCoord(display.longitude)}</dd>
              </div>
              {display.accuracyMeters != null && (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground text-xs">Précision</dt>
                  <dd>± {Math.round(display.accuracyMeters)} m</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-muted-foreground text-sm">
              Aucune position capturée. Utilisez le bouton ci-dessous.
            </p>
          )}
        </div>

        {geo.lastKnownPosition && !geo.position && !geo.isLoading && (
          <p className="text-muted-foreground text-xs">
            Dernière position connue (session) affichée — actualisez pour confirmer sur
            place.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="default"
            size="sm"
            className="gap-2"
            disabled={geo.isLoading || !active}
            onClick={() => void geo.requestPermission()}
          >
            {geo.permission === "denied" ? (
              <>
                <Crosshair className="h-4 w-4" aria-hidden />
                Réessayer l’accès
              </>
            ) : (
              <>
                <Crosshair className="h-4 w-4" aria-hidden />
                Autoriser / capturer
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={geo.isLoading || !active}
            onClick={() => void geo.refreshPosition()}
          >
            <RefreshCw
              className={cn("h-4 w-4", geo.isLoading && "animate-spin")}
              aria-hidden
            />
            Actualiser
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
