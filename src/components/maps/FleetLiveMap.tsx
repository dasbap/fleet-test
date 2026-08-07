import { useEffect, useMemo } from "react";
import "leaflet/dist/leaflet.css";
import { Circle, CircleMarker, GeoJSON, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import { leafletLayer } from "protomaps-leaflet";
import type { Geofence, VehiclePositionLatest } from "@/types/gps";

interface FleetLiveMapProps {
  positions: VehiclePositionLatest[];
  geofences: Geofence[];
  protomapsPmtilesUrl?: string;
  tileUrl?: string;
  tileAttribution?: string;
}

type GeoJsonFeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>;

const DEFAULT_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const DEFAULT_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const PROTOMAPS_ATTRIBUTION =
  '<a href="https://github.com/protomaps/basemaps">Protomaps</a> &copy; <a href="https://openstreetmap.org">OpenStreetMap</a>';
const YAOUNDE_CENTER: [number, number] = [3.848, 11.5174];

function parseGeofenceGeometry(value: Geofence["polygon_geojson"]): GeoJSON.Polygon | GeoJSON.MultiPolygon | null {
  if (!value) {
    return null;
  }

  const geometry = typeof value === "string" ? (JSON.parse(value) as unknown) : value;
  if (
    geometry &&
    typeof geometry === "object" &&
    "type" in geometry &&
    (geometry.type === "Polygon" || geometry.type === "MultiPolygon")
  ) {
    return geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon;
  }

  return null;
}

function FitFleetBounds({ positions }: { positions: VehiclePositionLatest[] }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length === 0) {
      map.setView(YAOUNDE_CENTER, 10);
      return;
    }

    const bounds = positions.map((position) => [position.latitude, position.longitude]) as LatLngBoundsExpression;
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
  }, [map, positions]);

  return null;
}

function ProtomapsPmtilesLayer({ url }: { url: string }) {
  const map = useMap();

  useEffect(() => {
    const layer = leafletLayer({
      url,
      flavor: "light",
      lang: "fr",
      attribution: PROTOMAPS_ATTRIBUTION,
    });

    layer.addTo(map);

    return () => {
      layer.remove();
    };
  }, [map, url]);

  return null;
}

export function FleetLiveMap({
  positions,
  geofences,
  protomapsPmtilesUrl,
  tileUrl = DEFAULT_TILE_URL,
  tileAttribution = DEFAULT_ATTRIBUTION,
}: FleetLiveMapProps) {
  const activeCircleGeofences = useMemo(
    () =>
      geofences.filter(
        (geofence) =>
          geofence.is_active &&
          geofence.geofence_type === "circle" &&
          geofence.center_lat !== null &&
          geofence.center_lng !== null &&
          geofence.radius_m !== null,
      ),
    [geofences],
  );

  const geofenceFeatures = useMemo<GeoJsonFeatureCollection>(() => {
    const features: GeoJSON.Feature<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>[] = [];

    geofences.forEach((geofence) => {
      if (geofence.is_active && geofence.geofence_type === "polygon" && geofence.polygon_geojson) {
        try {
          const geometry = parseGeofenceGeometry(geofence.polygon_geojson);
          if (geometry) {
            features.push({
              type: "Feature",
              geometry,
              properties: { geofenceName: geofence.name },
            });
          }
        } catch (error) {
          console.warn("[FleetLiveMap] Polygone geofence invalide ignore:", error);
        }
      }
    });

    return { type: "FeatureCollection", features };
  }, [geofences]);

  return (
    <div className="h-[32rem] w-full overflow-hidden rounded-card border border-surface-raised">
      <MapContainer center={YAOUNDE_CENTER} zoom={10} className="h-full w-full" scrollWheelZoom>
        {protomapsPmtilesUrl ? (
          <ProtomapsPmtilesLayer url={protomapsPmtilesUrl} />
        ) : (
          <TileLayer attribution={tileAttribution} url={tileUrl} />
        )}
        <FitFleetBounds positions={positions} />

        {geofenceFeatures.features.length > 0 ? (
          <GeoJSON
            key={JSON.stringify(geofenceFeatures)}
            data={geofenceFeatures}
            pathOptions={{ color: "#2563eb", fillColor: "#3b82f6", fillOpacity: 0.15, weight: 2 }}
          />
        ) : null}

        {activeCircleGeofences.map((geofence) => (
          <Circle
            key={geofence.id}
            center={[geofence.center_lat!, geofence.center_lng!]}
            radius={geofence.radius_m!}
            pathOptions={{ color: "#2563eb", fillColor: "#3b82f6", fillOpacity: 0.12, weight: 2 }}
          />
        ))}

        {positions.map((position) => (
          <CircleMarker
            key={position.id}
            center={[position.latitude, position.longitude]}
            radius={8}
            pathOptions={{ color: "#166534", fillColor: "#22c55e", fillOpacity: 0.9, weight: 2 }}
          >
            <Popup>
              <div className="space-y-1 text-sm">
                <p className="font-semibold">{position.vehicle_id}</p>
                <p>Vitesse: {Math.round(position.speed_kmh ?? 0)} km/h</p>
                <p>Maj: {new Date(position.tracker_time).toLocaleString("fr-FR")}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
