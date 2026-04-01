import { Share } from "@capacitor/share";
import { isNativePlatform } from "@/lib/platform";
import type { SharePayload, ShareResult, ShareOutcome } from "@/types/share";
import type { Vehicle } from "@/hooks/useVehicles";
import type { Alert, AlertType } from "@/hooks/useAlerts";
import { buildVehicleHistoryEvents } from "@/features/fleet/lib/vehicleHistory";
import { buildEsambaDeepLinkUrl } from "@/lib/deepLinks/parseDeepLink";
import type {
  AlertDto,
  IncidentWorkflowStatusDto,
  OperationalAlertSeverityDto,
  OperationalAlertTypeDto,
} from "@/types/dto/alert.dto";
import type { VehicleDto } from "@/types/dto/vehicle.dto";

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

/**
 * Texte structuré pour export (fiche + historique unifié).
 */
export function buildVehicleHistoryDocumentText(
  vehicle: VehicleDto,
  alerts: AlertDto[],
): string {
  const events = buildVehicleHistoryEvents(vehicle, alerts);
  const header = [
    "══════════════════════════════════════",
    "Flotte E-Samba — Fiche véhicule (export)",
    "══════════════════════════════════════",
    `Immatriculation : ${vehicle.registration}`,
    `${vehicle.brand ?? ""} ${vehicle.model ?? ""}`.trim() || "—",
    `Kilométrage : ${vehicle.current_km.toLocaleString("fr-FR")} km`,
    `Statut : ${vehicle.status === "blocked" ? "Bloqué" : "Actif"}`,
  ];
  if (vehicle.blocked_reason) {
    header.push(`Motif de blocage : ${vehicle.blocked_reason}`);
  }
  header.push("", "--- Historique ---", "");
  for (const e of events) {
    const when = new Date(e.at).toLocaleString("fr-FR");
    header.push(`• ${when} — ${e.title}`);
    if (e.description) {
      header.push(`  ${e.description}`);
    }
  }
  return header.join("\n");
}

/**
 * Partage résumé + document .txt (Web Share API) et lien `esamba://` dans le corps.
 */
export function buildVehicleDocumentSharePayload(
  vehicle: VehicleDto,
  alerts: AlertDto[],
  detailPath: string,
): SharePayload {
  const base = buildVehicleSharePayload(vehicle, detailPath);
  const docRest = buildVehicleHistoryDocumentText(vehicle, alerts);
  const esambaUrl = buildEsambaDeepLinkUrl({ screen: "vehicle", id: vehicle.id });
  const fullText = `${base.text}\n\n---\n\n${docRest}\n\nOuverture app : ${esambaUrl}`;
  const safeName = vehicle.registration.replace(/[^a-zA-Z0-9_-]+/g, "_");
  const file =
    typeof File !== "undefined"
      ? new File([fullText], `fiche-vehicule-${safeName}.txt`, {
          type: "text/plain;charset=utf-8",
        })
      : undefined;
  return {
    title: base.title,
    text: fullText,
    url: base.url,
    files: file ? [file] : undefined,
  };
}

const ALERT_TYPE_FR: Record<AlertType, string> = {
  missing_closure: "Clôture manquante",
  recurring_gap: "Écart récurrent",
  risky_driver: "Chauffeur à risque",
  vehicle_blocked: "Véhicule bloqué",
};

const WORKFLOW_STATUS_FR: Record<IncidentWorkflowStatusDto, string> = {
  NOUVEAU: "Nouveau",
  EN_COURS: "En cours",
  RESOLU: "Résolu",
};

const DTO_ALERT_TYPE_FR: Record<OperationalAlertTypeDto, string> = {
  missing_closure: "Clôture manquante",
  recurring_gap: "Écart récurrent",
  risky_driver: "Chauffeur à risque",
  vehicle_blocked: "Véhicule bloqué",
};

const DTO_SEVERITY_FR: Record<OperationalAlertSeverityDto, string> = {
  critical: "Critique",
  high: "Élevée",
  medium: "Moyenne",
  low: "Faible",
};

/**
 * Partage basé sur l’alerte persistante (`AlertDto`) — lien web + lien natif `esamba://`.
 */
export function buildAlertDtoSharePayload(alert: AlertDto, detailPath: string): SharePayload {
  const url = getAbsoluteUrl(detailPath);
  const esambaUrl = buildEsambaDeepLinkUrl({ screen: "alert", id: alert.id });
  const typeLabel = DTO_ALERT_TYPE_FR[alert.alert_type] ?? alert.alert_type;
  const sev = DTO_SEVERITY_FR[alert.severity] ?? alert.severity;
  const statusLabel = WORKFLOW_STATUS_FR[alert.status] ?? alert.status;
  const dateStr = new Date(alert.created_at).toLocaleString("fr-FR");
  const text = [
    "Flotte E-Samba — Alerte",
    `Type : ${typeLabel}`,
    `Gravité : ${sev}`,
    `Statut workflow : ${statusLabel}`,
    `Véhicule (id) : ${alert.vehicle_id ?? "—"}`,
    "",
    alert.message,
    "",
    `Créée le ${dateStr}`,
    "",
    `Lien web : ${url}`,
    `Ouverture app : ${esambaUrl}`,
  ].join("\n");

  return {
    title: `Alerte — ${typeLabel}`,
    text,
    url,
  };
}

export interface AlertCommentShareRow {
  body: string;
  created_at: string;
  author_user_id?: string | null;
}

/**
 * Document texte (.txt sur le web si le navigateur le permet) + résumé et commentaires.
 */
export function buildAlertDtoDocumentSharePayload(
  alert: AlertDto,
  detailPath: string,
  comments?: AlertCommentShareRow[],
): SharePayload {
  const base = buildAlertDtoSharePayload(alert, detailPath);
  let block = base.text;
  if (comments?.length) {
    const lines = comments.map((c) => {
      const when = new Date(c.created_at).toLocaleString("fr-FR");
      const who = c.author_user_id?.trim() || "—";
      return `[${when}] (${who})\n${c.body.trim()}`;
    });
    block += `\n\n--- Commentaires ---\n\n${lines.join("\n\n")}`;
  }
  const file =
    typeof File !== "undefined"
      ? new File([block], `alerte-flotte-${alert.id.replace(/[^a-zA-Z0-9_-]+/g, "_")}.txt`, {
          type: "text/plain;charset=utf-8",
        })
      : undefined;
  return {
    title: base.title,
    text: block,
    url: base.url,
    files: file ? [file] : undefined,
  };
}

/** @deprecated Préférer `buildAlertDtoSharePayload` avec les données persistées. */
export function buildAlertSharePayload(alert: Alert, detailPath: string): SharePayload {
  const url = getAbsoluteUrl(detailPath);
  const typeLabel = ALERT_TYPE_FR[alert.type] ?? alert.type;
  const sev =
    alert.severity === "critical"
      ? "Critique"
      : alert.severity === "warning"
        ? "Avertissement"
        : "Info";
  const dateStr = new Date(alert.createdAt).toLocaleString("fr-FR");
  const text = [
    "Flotte E-Samba — Alerte",
    `Type : ${typeLabel}`,
    `Gravité : ${sev}`,
    `Statut : ${alert.status === "resolved" ? "Résolue" : "Active"}`,
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
