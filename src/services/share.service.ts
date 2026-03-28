import { Share } from "@capacitor/share";
import { isNativePlatform } from "@/lib/platform";
import type { SharePayload, ShareResult, ShareOutcome } from "@/types/share";
import type { Vehicle } from "@/hooks/useVehicles";
import type { Alert, AlertSeverity, AlertType } from "@/hooks/useAlerts";

function isUserCancelled(error: unknown): boolean {
  if (error == null) return false;
  const name = error instanceof Error ? error.name : "";
  const msg = String(error instanceof Error ? error.message : error).toLowerCase();
  return (
    name === "AbortError" ||
    msg.includes("cancel") ||
    msg.includes("abort") ||
    msg.includes("dismiss") ||
    msg.includes("user did not share")
  );
}

function buildClipboardText(payload: SharePayload): string {
  const parts = [payload.text.trim()];
  if (payload.url?.trim()) {
    parts.push(payload.url.trim());
  }
  return parts.join("\n\n");
}

async function copyToClipboard(text: string): Promise<ShareOutcome> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return "copied";
    }
  } catch {
    // ignore
  }
  return "unavailable";
}

/**
 * Indique si un partage système est probablement disponible (natif ou Web Share API).
 */
export async function isShareAvailable(): Promise<boolean> {
  if (isNativePlatform()) {
    try {
      const { value } = await Share.canShare();
      return value;
    } catch {
      return true;
    }
  }
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

/**
 * Ouvre le partage natif (Capacitor) ou le Web Share API, sinon copie le texte dans le presse-papiers.
 */
export async function shareContent(payload: SharePayload): Promise<ShareResult> {
  const title = payload.title?.trim() || "Flotte E-Samba";
  const dialogTitle = title;
  const textBody = payload.text.trim();
  const url = payload.url?.trim();

  if (isNativePlatform()) {
    try {
      const { value: can } = await Share.canShare();
      if (!can) {
        const o = await copyToClipboard(buildClipboardText(payload));
        return { outcome: o };
      }

      const options: Parameters<typeof Share.share>[0] = {
        title,
        text: textBody,
        url: url || undefined,
        dialogTitle,
      };

      if (payload.fileUrls?.length) {
        options.files = payload.fileUrls;
      }

      await Share.share(options);
      return { outcome: "shared" };
    } catch (e) {
      if (isUserCancelled(e)) {
        return { outcome: "cancelled" };
      }
      const o = await copyToClipboard(buildClipboardText(payload));
      return { outcome: o };
    }
  }

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      const files = payload.files?.filter(Boolean) ?? [];
      if (files.length > 0 && navigator.canShare && navigator.canShare({ files })) {
        await navigator.share({
          title,
          text: textBody,
          files,
        });
        return { outcome: "shared" };
      }

      await navigator.share({
        title,
        text: textBody,
        url: url || undefined,
      });
      return { outcome: "shared" };
    } catch (e) {
      if (isUserCancelled(e)) {
        return { outcome: "cancelled" };
      }
      const o = await copyToClipboard(buildClipboardText(payload));
      return { outcome: o };
    }
  }

  const o = await copyToClipboard(buildClipboardText(payload));
  return { outcome: o };
}

// —— Helpers de contenu (présentation uniquement, réutilisables par les écrans) ——

export function getAbsoluteUrl(path: string): string {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildVehicleSharePayload(vehicle: Vehicle, detailPath: string): SharePayload {
  const url = getAbsoluteUrl(detailPath);
  const lines = [
    "Flotte E-Samba — Fiche véhicule",
    `${vehicle.brand ?? ""} ${vehicle.model ?? ""}`.trim() || "Véhicule",
    `Immatriculation : ${vehicle.registration}`,
    `Kilométrage : ${vehicle.current_km.toLocaleString("fr-FR")} km`,
  ];
  if (vehicle.blocked_reason) {
    lines.push(`Motif de blocage : ${vehicle.blocked_reason}`);
  }
  return {
    title: `Véhicule ${vehicle.registration}`,
    text: lines.join("\n"),
    url,
  };
}

const ALERT_TYPE_FR: Record<AlertType, string> = {
  missing_closure: "Clôture manquante",
  recurring_gap: "Écart récurrent",
  risky_driver: "Chauffeur à risque",
  vehicle_blocked: "Véhicule bloqué",
};

const SEVERITY_FR: Record<AlertSeverity, string> = {
  critical: "Critique",
  high: "Élevée",
  medium: "Moyenne",
  low: "Faible",
};

export function buildAlertSharePayload(alert: Alert, detailPath: string): SharePayload {
  const url = getAbsoluteUrl(detailPath);
  const typeLabel = ALERT_TYPE_FR[alert.alert_type] ?? alert.alert_type;
  const sev = SEVERITY_FR[alert.severity] ?? alert.severity;
  const dateStr = new Date(alert.created_at).toLocaleString("fr-FR");
  const text = [
    "Flotte E-Samba — Alerte",
    `Type : ${typeLabel}`,
    `Gravité : ${sev}`,
    `Statut : ${alert.resolved ? "Résolue" : "Active"}`,
    "",
    alert.message,
    "",
    `Signalée le ${dateStr}`,
  ].join("\n");

  return {
    title: `Alerte — ${typeLabel}`,
    text,
    url,
  };
}

export interface InterventionShareInput {
  reference: string;
  vehicleLabel: string;
  plate: string;
  summary: string;
  detailPath?: string;
}

/** Bon d’intervention / fiche atelier (texte structuré). */
export function buildInterventionSharePayload(input: InterventionShareInput): SharePayload {
  const lines = [
    "Flotte E-Samba — Intervention",
    `Référence : ${input.reference}`,
    `Véhicule : ${input.vehicleLabel} (${input.plate})`,
    "",
    input.summary,
  ];
  const payload: SharePayload = {
    title: `Intervention ${input.reference}`,
    text: lines.join("\n"),
  };
  if (input.detailPath) {
    payload.url = getAbsoluteUrl(input.detailPath);
  }
  return payload;
}

export interface IncidentPhotoShareInput {
  /** Description affichée dans le message. */
  description: string;
  /** URL de la photo (partage par lien si pas de fichier local). */
  photoUrl?: string;
  /** Fichier image (web — Web Share API). */
  photoFile?: File;
}

/** Résumé incident + lien photo ou partage fichier sur le web. */
export function buildIncidentPhotoSharePayload(input: IncidentPhotoShareInput): SharePayload {
  const lines = ["Flotte E-Samba — Incident", "", input.description.trim()];
  if (input.photoUrl?.trim()) {
    lines.push("", `Photo : ${input.photoUrl.trim()}`);
  }
  const payload: SharePayload = {
    title: "Incident — photo",
    text: lines.join("\n"),
    url: input.photoUrl?.trim() || undefined,
  };
  if (input.photoFile) {
    payload.files = [input.photoFile];
  }
  return payload;
}
