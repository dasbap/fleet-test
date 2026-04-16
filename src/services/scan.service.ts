import { ScanRepository } from "@/repositories/scan.repository";

const ESAMBA_PUBLIC_HOST = "e-samba.com";
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeHostname(host: string): string {
  return host.replace(/^www\./i, "").toLowerCase();
}

function isUuidV4(value: string): boolean {
  return UUID_V4_REGEX.test(value.trim());
}

/**
 * Extrait l'identifiant véhicule depuis une URL publique du site (QR marketing).
 * Hostname autorisé : e-samba.com (avec ou sans www).
 */
export function tryExtractVehicleIdFromPublicEsambaUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    try {
      const withScheme = trimmed.startsWith("//")
        ? `https:${trimmed}`
        : trimmed.includes("://")
          ? trimmed
          : `https://${trimmed}`;
      url = new URL(withScheme);
    } catch {
      return null;
    }
  }

  if (normalizeHostname(url.hostname) !== ESAMBA_PUBLIC_HOST) {
    return null;
  }

  const match = url.pathname.match(/\/vehicule\/([^/?#]+)/i);
  if (!match?.[1]) return null;
  const id = decodeURIComponent(match[1].trim());
  return isUuidV4(id) ? id : null;
}

function tryExtractVehicleIdFromEsambaDeepLink(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("esamba://")) return null;

  const payload = trimmed.replace("esamba://", "");
  const parts = payload.split("/");
  if (parts.length < 2) return null;

  const entity = parts[0]?.toLowerCase();
  const id = decodeURIComponent((parts[1] ?? "").trim());
  if (!id) return null;

  // Nouveau format terrain: esamba://vehicule/{uuid}
  if (entity === "vehicule") {
    return isUuidV4(id) ? id : null;
  }

  // Compatibilité historique: esamba://vehicle/{id}
  if (entity === "vehicle") {
    return id;
  }

  return null;
}

export type ScanTarget =
  | { kind: "vehicle"; vehicleId?: string; registration?: string }
  | { kind: "part"; partRef: string };

export interface ScanResolution {
  kind: "vehicle" | "part";
  route: string;
  label: string;
}

export class ScanService {
  constructor(private readonly repository: ScanRepository) {}

  parseRawScan(rawValue: string): ScanTarget {
    const raw = rawValue.trim();
    if (!raw) {
      throw new Error("Le code scanné est vide.");
    }

    const fromPublicUrl = tryExtractVehicleIdFromPublicEsambaUrl(raw);
    if (fromPublicUrl) {
      return { kind: "vehicle", vehicleId: fromPublicUrl };
    }

    const fromDeepLink = tryExtractVehicleIdFromEsambaDeepLink(raw);
    if (fromDeepLink) {
      return { kind: "vehicle", vehicleId: fromDeepLink };
    }

    if (raw.startsWith("esamba://vehicule/")) {
      throw new Error("Le QR véhicule est invalide. Format attendu: esamba://vehicule/{uuid-v4}.");
    }

    if (raw.startsWith("esamba://vehicle/")) {
      throw new Error("Le QR véhicule ne contient pas d'identifiant valide.");
    }

    if (raw.startsWith("VEH:")) {
      return { kind: "vehicle", registration: raw.replace("VEH:", "").trim().toUpperCase() };
    }

    if (raw.startsWith("PART:")) {
      const partRef = raw.replace("PART:", "").trim().toUpperCase();
      if (!partRef) throw new Error("Le code pièce est invalide.");
      return { kind: "part", partRef };
    }

    return { kind: "vehicle", registration: raw.toUpperCase() };
  }

  async resolveScan(rawValue: string, fleetId: string): Promise<ScanResolution> {
    if (!fleetId) {
      throw new Error("Flotte introuvable pour résoudre le scan.");
    }
    const target = this.parseRawScan(rawValue);
    if (target.kind === "part") {
      return {
        kind: "part",
        route: `/dashboard/maintenance?part=${encodeURIComponent(target.partRef)}`,
        label: `Pièce ${target.partRef}`,
      };
    }

    if (target.vehicleId) {
      const vehicle = await this.repository.findVehicleById(target.vehicleId, fleetId);
      if (!vehicle) {
        throw new Error("Véhicule introuvable dans votre flotte.");
      }
      return {
        kind: "vehicle",
        route: `/dashboard/vehicles/${vehicle.id}`,
        label: vehicle.registration,
      };
    }

    const registration = target.registration ?? "";
    const vehicle = await this.repository.findVehicleByRegistration(registration, fleetId);
    if (!vehicle) {
      throw new Error("Aucun véhicule ne correspond au code scanné.");
    }
    return {
      kind: "vehicle",
      route: `/dashboard/vehicles/${vehicle.id}`,
      label: vehicle.registration,
    };
  }
}

