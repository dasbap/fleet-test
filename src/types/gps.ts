export type TrackerProtocol = "tk103" | "concox";

export type GeofenceType = "circle" | "polygon";

export type GeofenceEventType = "enter" | "exit";

export type GeofenceGeometry = GeoJSON.Polygon | GeoJSON.MultiPolygon;

export interface VehiclePosition {
  id: string;
  vehicle_id: string;
  fleet_id: string;
  latitude: number;
  longitude: number;
  speed_kmh: number | null;
  heading: number | null;
  altitude_m: number | null;
  tracker_time: string;
  received_at: string;
}

export interface VehiclePositionLatest extends VehiclePosition {
  tracker_imei: string | null;
}

export interface Geofence {
  id: string;
  fleet_id: string;
  name: string;
  geofence_type: GeofenceType;
  center_lat: number | null;
  center_lng: number | null;
  radius_m: number | null;
  polygon_geojson: GeofenceGeometry | string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GeofenceEvent {
  id: string;
  fleet_id: string;
  vehicle_id: string;
  geofence_id: string;
  event_type: GeofenceEventType;
  occurred_at: string;
  latitude: number;
  longitude: number;
  tracker_imei: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface GpsTrackerDevice {
  id: string;
  fleet_id: string;
  vehicle_id: string;
  imei: string;
  protocol: TrackerProtocol;
  is_active: boolean;
  label: string | null;
  created_at: string;
  updated_at: string;
}
