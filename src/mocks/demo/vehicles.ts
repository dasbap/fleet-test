import type {
  FleetVehicleAssignedDriver,
  FleetVehicleDetail,
  FleetVehicleDocumentExpiry,
  FleetVehicleMaintenanceEntry,
} from "@/types/fleet-vehicle";
import { demoIsoFuture, demoIsoPast } from "@/mocks/demo/constants";
import { getDocumentsForVehicle } from "@/mocks/demo/vehicleDocuments";
import { getTimelineForVehicle } from "@/mocks/demo/timelineEvents";

/** Sélection documents à surveiller (90 jours ou déjà expiré récent). */
function documentsExpiringForVehicle(vehicleId: string): FleetVehicleDocumentExpiry[] {
  const now = Date.now();
  const horizon = now + 90 * 86_400_000;
  return getDocumentsForVehicle(vehicleId)
    .filter((d) => {
      if (!d.expiryDate) return false;
      const t = new Date(d.expiryDate).getTime();
      return t < horizon;
    })
    .slice(0, 4)
    .map((d) => ({
      id: d.id,
      label: d.label,
      expiryDate: d.expiryDate!,
    }));
}

function driver(
  id: string,
  fullName: string,
  phone: string
): FleetVehicleAssignedDriver {
  return { id, fullName, phone };
}

const MAINT_BY_VEH: Record<string, FleetVehicleMaintenanceEntry[]> = {
  "veh-01": [
    { id: "mh-01a", date: demoIsoPast(30, 2), label: "Vidange + filtres", km: 138_000, provider: "Garage Centrale" },
    { id: "mh-01b", date: demoIsoPast(120, 0), label: "Freins arrière", km: 132_500, provider: "Garage Centrale" },
  ],
  "veh-02": [
    { id: "mh-02a", date: demoIsoPast(14, 4), label: "Révision 90 000 km", km: 88_900, provider: "Toyota Thiès" },
  ],
  "veh-03": [
    { id: "mh-03a", date: demoIsoPast(60, 1), label: "Embrayage", km: 251_000, provider: "Volvo Trucks SN" },
  ],
  "veh-04": [
    { id: "mh-04a", date: demoIsoPast(0, 2), label: "Contrôle groupe frigorifique", km: 178_400, provider: "Atelier froid Dakar" },
  ],
  "veh-05": [
    { id: "mh-05a", date: demoIsoPast(90, 3), label: "Pneus 4x4", km: 62_000, provider: "Ford Service" },
  ],
  "veh-06": [
    { id: "mh-06a", date: demoIsoPast(200, 0), label: "Distribution", km: 195_000, provider: "Peugeot SL" },
  ],
  "veh-07": [
    { id: "mh-07a", date: demoIsoPast(45, 2), label: "Contrôle suspension", km: 112_000, provider: "Renault Van" },
  ],
  "veh-08": [
    { id: "mh-08a", date: demoIsoPast(20, 5), label: "Vidange pont", km: 310_200, provider: "Isuzu Pro" },
  ],
  "veh-09": [
    { id: "mh-09a", date: demoIsoPast(60, 0), label: "Révision constructeur", km: 95_400, provider: "Toyota" },
  ],
  "veh-10": [
    { id: "mh-10a", date: demoIsoPast(15, 1), label: "Diagnostic FAP", km: 420_000, provider: "Mercedes Truck" },
  ],
  "veh-11": [
    { id: "mh-11a", date: demoIsoPast(90, 4), label: "Freinage", km: 156_000, provider: "Fiat Pro" },
  ],
  "veh-12": [
    { id: "mh-12a", date: demoIsoPast(40, 2), label: "Contrôle climatisation", km: 88_100, provider: "Hyundai SL" },
  ],
};

function v(
  base: Omit<
    FleetVehicleDetail,
    | "documentsExpiringSoon"
    | "maintenanceHistory"
    | "timeline"
  >
): FleetVehicleDetail {
  return {
    ...base,
    documentsExpiringSoon: documentsExpiringForVehicle(base.id),
    maintenanceHistory: MAINT_BY_VEH[base.id] ?? [],
    timeline: getTimelineForVehicle(base.id),
  };
}

/**
 * 12 véhicules — statuts et km cohérents avec missions / atelier.
 */
export const MOCK_DEMO_VEHICLES: FleetVehicleDetail[] = [
  v({
    id: "veh-01",
    registration: "AB-123-CD",
    vehicleType: "Fourgon 12 m³",
    brand: "Mercedes-Benz",
    model: "Sprinter",
    availability: "on_mission",
    statusLabel: "En mission",
    nextMaintenanceAt: demoIsoFuture(8),
    lastKnownLocation: "Dakar — Plateau",
    openAlertsCount: 2,
    currentKm: 142_300,
    locationLabel: "Dakar — Plateau, près de la Poste",
    locationUpdatedAt: demoIsoPast(0, 0.4),
    coordinates: { lat: 14.6928, lng: -17.4467 },
    assignedDriver: driver("usr-05", "Amadou Diallo", "+221770011223"),
  }),
  v({
    id: "veh-02",
    registration: "EF-456-GH",
    vehicleType: "VL berline",
    brand: "Toyota",
    model: "Corolla",
    availability: "available",
    statusLabel: "Disponible",
    nextMaintenanceAt: demoIsoFuture(21),
    lastKnownLocation: "Thiès — dépôt",
    openAlertsCount: 1,
    currentKm: 89_200,
    locationLabel: "Thiès — Dépôt logistique",
    locationUpdatedAt: demoIsoPast(3, 2),
    assignedDriver: null,
  }),
  v({
    id: "veh-03",
    registration: "IJ-789-KL",
    vehicleType: "Camion plateau",
    brand: "Volvo",
    model: "FE",
    availability: "stopped",
    statusLabel: "À l’arrêt",
    nextMaintenanceAt: demoIsoFuture(3),
    lastKnownLocation: "Pikine — parc",
    openAlertsCount: 2,
    currentKm: 256_000,
    locationLabel: "Pikine — Parc véhicules",
    locationUpdatedAt: demoIsoPast(2, 8),
    assignedDriver: null,
  }),
  v({
    id: "veh-04",
    registration: "MN-012-OP",
    vehicleType: "Fourgon frigorifique",
    brand: "Iveco",
    model: "Daily",
    availability: "maintenance",
    statusLabel: "Maintenance",
    nextMaintenanceAt: demoIsoFuture(180),
    lastKnownLocation: "Dakar — atelier",
    openAlertsCount: 1,
    currentKm: 178_400,
    locationLabel: "Dakar — Atelier froid & mécanique",
    locationUpdatedAt: demoIsoPast(0, 1),
    assignedDriver: driver("usr-04", "Fatou Ndiaye", "+221763334455"),
  }),
  v({
    id: "veh-05",
    registration: "QR-345-ST",
    vehicleType: "Pick-up",
    brand: "Ford",
    model: "Ranger",
    availability: "on_mission",
    statusLabel: "En mission",
    nextMaintenanceAt: demoIsoFuture(15),
    lastKnownLocation: "Route — Rufisque",
    openAlertsCount: 1,
    currentKm: 67_100,
    locationLabel: "En route — Rufisque",
    locationUpdatedAt: demoIsoPast(0, 0.2),
    assignedDriver: driver("usr-08", "Ibrahima Sarr", "+221769988776"),
  }),
  v({
    id: "veh-06",
    registration: "UV-678-WX",
    vehicleType: "Minibus",
    brand: "Peugeot",
    model: "Boxer",
    availability: "available",
    statusLabel: "Disponible",
    nextMaintenanceAt: demoIsoFuture(40),
    lastKnownLocation: "Saint-Louis — gare routière",
    openAlertsCount: 0,
    currentKm: 201_000,
    locationLabel: "Saint-Louis — Gare routière",
    locationUpdatedAt: demoIsoPast(6, 1),
    assignedDriver: null,
  }),
  v({
    id: "veh-07",
    registration: "YZ-111-AA",
    vehicleType: "Fourgon 10 m³",
    brand: "Renault",
    model: "Master",
    availability: "on_mission",
    statusLabel: "En mission",
    nextMaintenanceAt: demoIsoFuture(25),
    lastKnownLocation: "Dakar — Médina",
    openAlertsCount: 1,
    currentKm: 124_800,
    locationLabel: "Dakar — Médina",
    locationUpdatedAt: demoIsoPast(0, 1.5),
    assignedDriver: driver("usr-07", "Aïssatou Ba", "+221775566778"),
  }),
  v({
    id: "veh-08",
    registration: "BB-222-CC",
    vehicleType: "Camion benne",
    brand: "Isuzu",
    model: "NQR",
    availability: "maintenance",
    statusLabel: "Maintenance",
    nextMaintenanceAt: demoIsoFuture(10),
    lastKnownLocation: "Dakar — atelier Isuzu",
    openAlertsCount: 2,
    currentKm: 312_400,
    locationLabel: "Dakar — Atelier agréé",
    locationUpdatedAt: demoIsoPast(0, 5),
    assignedDriver: null,
  }),
  v({
    id: "veh-09",
    registration: "DD-333-EE",
    vehicleType: "Pick-up double cabine",
    brand: "Toyota",
    model: "Hilux",
    availability: "available",
    statusLabel: "Disponible",
    nextMaintenanceAt: demoIsoFuture(55),
    lastKnownLocation: "Thiès — parc",
    openAlertsCount: 1,
    currentKm: 98_200,
    locationLabel: "Thiès — Parc secondaire",
    locationUpdatedAt: demoIsoPast(12, 0),
    assignedDriver: driver("usr-08", "Ibrahima Sarr", "+221769988776"),
  }),
  v({
    id: "veh-10",
    registration: "FF-444-GG",
    vehicleType: "Porteur 18 t",
    brand: "Mercedes-Benz",
    model: "Atego",
    availability: "on_mission",
    statusLabel: "En mission",
    nextMaintenanceAt: demoIsoFuture(12),
    lastKnownLocation: "Autoroute — Thiès",
    openAlertsCount: 1,
    currentKm: 428_900,
    locationLabel: "En transit — axe Dakar–Thiès",
    locationUpdatedAt: demoIsoPast(0, 0.5),
    assignedDriver: driver("usr-06", "Pape Ndiaye", "+221781122334"),
  }),
  v({
    id: "veh-11",
    registration: "HH-555-II",
    vehicleType: "Fourgon 8 m³",
    brand: "Fiat",
    model: "Ducato",
    availability: "stopped",
    statusLabel: "À l’arrêt",
    nextMaintenanceAt: demoIsoFuture(33),
    lastKnownLocation: "Saint-Louis — dépôt",
    openAlertsCount: 1,
    currentKm: 163_500,
    locationLabel: "Saint-Louis — Dépôt froid",
    locationUpdatedAt: demoIsoPast(48, 0),
    assignedDriver: null,
  }),
  v({
    id: "veh-12",
    registration: "JJ-666-KK",
    vehicleType: "Minibus 17 places",
    brand: "Hyundai",
    model: "H350",
    availability: "available",
    statusLabel: "Disponible",
    nextMaintenanceAt: demoIsoFuture(18),
    lastKnownLocation: "Dakar — Liberté 6",
    openAlertsCount: 1,
    currentKm: 91_700,
    locationLabel: "Dakar — Liberté 6",
    locationUpdatedAt: demoIsoPast(8, 2),
    assignedDriver: driver("usr-09", "Ousmane Kane", "+221772009988"),
  }),
];

export function getDemoVehicleById(id: string): FleetVehicleDetail | undefined {
  return MOCK_DEMO_VEHICLES.find((x) => x.id === id);
}

export function vehicleLabel(vehicleId: string): string {
  const x = getDemoVehicleById(vehicleId);
  if (!x) return vehicleId;
  return `${x.registration} · ${x.brand} ${x.model}`;
}
