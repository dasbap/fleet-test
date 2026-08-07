import { AlertTriangle, RadioTower, Satellite } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FleetLiveMap } from "@/components/maps/FleetLiveMap";
import {
  useGeofences,
  useGpsDevices,
  useRecentGeofenceEvents,
  useVehiclePositionsLive,
} from "@/hooks/useFleetTracking";

export default function FleetLiveMapPage() {
  const positionsQuery = useVehiclePositionsLive();
  const geofencesQuery = useGeofences();
  const eventsQuery = useRecentGeofenceEvents(10);
  const devicesQuery = useGpsDevices();
  const mapTileUrl = import.meta.env.VITE_MAP_TILE_URL;
  const protomapsPmtilesUrl = import.meta.env.VITE_PROTOMAPS_PM_TILES_URL;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold">Suivi GPS</h1>
        <p className="text-muted-foreground">
          Positions live des véhicules, zones géographiques et événements de sortie.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <RadioTower className="h-4 w-4" />
              Traceurs actifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{devicesQuery.data?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Satellite className="h-4 w-4" />
              Véhicules localisés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{positionsQuery.data?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Sorties de zone (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {eventsQuery.data?.filter((event) => event.event_type === "exit").length ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <FleetLiveMap
        positions={positionsQuery.data ?? []}
        geofences={geofencesQuery.data ?? []}
        protomapsPmtilesUrl={protomapsPmtilesUrl}
        tileUrl={mapTileUrl}
      />

      <Card>
        <CardHeader>
          <CardTitle>Derniers événements geofence</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(eventsQuery.data ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucun événement récent.</p>
          ) : (
            eventsQuery.data?.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between rounded-card border border-surface-raised px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {event.event_type === "exit" ? "Sortie de zone" : "Entrée de zone"}
                  </p>
                  <p className="text-muted-foreground">
                    Véhicule {event.vehicle_id} - Zone {event.geofence_id}
                  </p>
                </div>
                <span className="text-muted-foreground">
                  {new Date(event.occurred_at).toLocaleString("fr-FR")}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
