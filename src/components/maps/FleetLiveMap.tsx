import { useEffect, useMemo, useRef } from "react";
import type mapboxgl from "mapbox-gl";
import type { GeoJSONSource } from "mapbox-gl";
import type { Geofence, VehiclePositionLatest } from "@/types/gps";

interface FleetLiveMapProps {
  positions: VehiclePositionLatest[];
  geofences: Geofence[];
  mapboxToken: string;
}

type GeoJsonFeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>;

const DEFAULT_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

export function FleetLiveMap({ positions, geofences, mapboxToken }: FleetLiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const mapboxModuleRef = useRef<(typeof import("mapbox-gl"))["default"] | null>(null);

  const geofenceFeatures = useMemo<GeoJsonFeatureCollection>(() => {
    const features: GeoJSON.Feature<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>[] = [];

    geofences.forEach((geofence) => {
      if (geofence.geofence_type === "polygon" && geofence.polygon_geojson) {
        try {
          const parsed = JSON.parse(geofence.polygon_geojson) as GeoJSON.Polygon | GeoJSON.MultiPolygon;
          features.push({
            type: "Feature",
            geometry: parsed,
            properties: { geofenceName: geofence.name },
          });
        } catch (error) {
          console.warn("[FleetLiveMap] Polygone geofence invalide ignoré:", error);
        }
      }
    });

    return { type: "FeatureCollection", features };
  }, [geofences]);

  useEffect(() => {
    let cancelled = false;

    const setupMap = async () => {
      if (!mapContainerRef.current || mapRef.current || !mapboxToken) {
        return;
      }

      const [{ default: mapboxglRuntime }] = await Promise.all([
        import("mapbox-gl"),
        import("mapbox-gl/dist/mapbox-gl.css"),
      ]);

      if (cancelled || !mapContainerRef.current || mapRef.current) {
        return;
      }

      mapboxModuleRef.current = mapboxglRuntime;
      mapboxglRuntime.accessToken = mapboxToken;

      const map = new mapboxglRuntime.Map({
        container: mapContainerRef.current,
        style: DEFAULT_STYLE,
        center: [11.5174, 3.848], // Yaoundé (fallback)
        zoom: 10,
        attributionControl: true,
      });

      map.addControl(new mapboxglRuntime.NavigationControl(), "top-right");
      mapRef.current = map;

      map.on("load", () => {
        map.addSource("geofences-source", {
          type: "geojson",
          data: geofenceFeatures,
        });
        map.addLayer({
          id: "geofences-fill",
          type: "fill",
          source: "geofences-source",
          paint: {
            "fill-color": "#3b82f6",
            "fill-opacity": 0.15,
          },
        });
        map.addLayer({
          id: "geofences-line",
          type: "line",
          source: "geofences-source",
          paint: {
            "line-color": "#3b82f6",
            "line-width": 2,
          },
        });
      });
    };

    void setupMap();

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
      mapboxModuleRef.current = null;
    };
  }, [mapboxToken, geofenceFeatures]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }
    const source = mapRef.current.getSource("geofences-source") as GeoJSONSource | undefined;
    if (source) {
      source.setData(geofenceFeatures);
    }
  }, [geofenceFeatures]);

  useEffect(() => {
    const mapboxModule = mapboxModuleRef.current;
    if (!mapRef.current || !mapboxModule) {
      return;
    }

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    positions.forEach((position) => {
      const marker = new mapboxModule.Marker({ color: "#22c55e" })
        .setLngLat([position.longitude, position.latitude])
        .setPopup(
          new mapboxModule.Popup({ offset: 18 }).setHTML(
            `<strong>${position.vehicle_id}</strong><br/>Vitesse: ${Math.round(
              position.speed_kmh ?? 0,
            )} km/h<br/>Maj: ${new Date(position.tracker_time).toLocaleString("fr-FR")}`,
          ),
        )
        .addTo(mapRef.current!);
      markersRef.current.push(marker);
    });

    if (positions.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      positions.forEach((position) => bounds.extend([position.longitude, position.latitude]));
      mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 400 });
    }
  }, [positions]);

  return <div ref={mapContainerRef} className="h-[32rem] w-full rounded-card overflow-hidden" />;
}
