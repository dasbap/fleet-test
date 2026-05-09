import { Capacitor } from "@capacitor/core";
import type {
  ActionPerformed,
  PermissionStatus,
  PluginListenerHandle,
  PushNotificationSchema,
  Token,
} from "@capacitor/push-notifications";
import { PushNotifications } from "@capacitor/push-notifications";
import { deepLinkService, type PushNotificationDeepLinkPayload } from "@/services/deep-link.service";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { isNativePlatform } from "@/lib/platform";

const LOG_TAG = "[Flotte E-Samba][Push]";

function pushLogInfo(message: string, meta?: Record<string, unknown>): void {
  console.info(`${LOG_TAG} ${message}`, meta && Object.keys(meta).length ? meta : "");
}

function pushLogDebug(message: string, meta?: Record<string, unknown>): void {
  const verbose =
    import.meta.env.DEV ||
    (typeof window !== "undefined" &&
      (window as unknown as { __ESAMBA_DEBUG_PUSH__?: boolean }).__ESAMBA_DEBUG_PUSH__ === true);
  if (!verbose) return;
  console.debug(`${LOG_TAG} ${message}`, meta && Object.keys(meta).length ? meta : "");
}

/** Catégories métier convenues avec le backend (payload FCM `data`, valeurs string). */
export type EsambaPushCategory =
  | "critical_alert"
  | "maintenance_due"
  | "intervention_assigned"
  | "document_expiring"
  | "incident_reported";

function pickString(record: Record<string, string>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const v = record[key];
    if (typeof v === "string" && v.trim() !== "") return v.trim();
  }
  return undefined;
}

/**
 * Normalise le payload `data` natif (FCM n’envoie que des strings ; défense en profondeur).
 */
export function normalizePushData(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v === undefined || v === null) continue;
    if (typeof v === "string") out[k] = v;
    else if (typeof v === "number" || typeof v === "boolean") out[k] = String(v);
  }
  return out;
}

function sanitizeInternalPath(path: string): string | null {
  const t = path.trim();
  if (!t.startsWith("/")) return null;
  if (t.includes("..")) return null;
  return t;
}

/**
 * Mappe les clés `data` FCM / APNs vers le payload attendu par `deepLinkService.dispatchFromPushPayload`.
 * Priorité : `esambaUrl` / `internalPath`, puis `category` + identifiants.
 */
export function mapPushDataToDeepLinkPayload(data: Record<string, string>): PushNotificationDeepLinkPayload | null {
  const esambaUrl = pickString(data, "esambaUrl", "esamba_url", "deep_link", "deepLink");
  if (esambaUrl) {
    return { esambaUrl };
  }

  const rawPath = pickString(data, "internalPath", "internal_path", "path", "route");
  if (rawPath) {
    const safe = sanitizeInternalPath(rawPath);
    if (safe) return { internalPath: safe };
    pushLogDebug("Chemin interne push ignoré (format invalide)", { rawPath });
    return null;
  }

  const category = (pickString(data, "category", "type", "esamba_category") ?? "").toLowerCase();

  const alertId = pickString(data, "alertId", "alert_id");
  const vehicleId = pickString(data, "vehicleId", "vehicle_id");
  const ticketId = pickString(data, "ticketId", "ticket_id", "intervention_id");
  const missionId = pickString(data, "missionId", "mission_id");

  switch (category) {
    case "critical_alert":
    case "alert":
      if (alertId) return { deepLinkTarget: { screen: "alert", id: alertId } };
      break;
    case "maintenance_due":
    case "maintenance":
      if (vehicleId) return { deepLinkTarget: { screen: "vehicle", id: vehicleId } };
      return { internalPath: ROUTE_PATHS.dashboardMaintenance };
    case "intervention_assigned":
    case "intervention":
      if (ticketId) return { deepLinkTarget: { screen: "intervention", id: ticketId } };
      break;
    case "document_expiring":
    case "document":
      if (vehicleId) return { deepLinkTarget: { screen: "vehicle", id: vehicleId } };
      return { internalPath: ROUTE_PATHS.dashboardSettings };
    case "incident_reported":
    case "incident":
      return { internalPath: ROUTE_PATHS.dashboardIncidents };
    case "mission_assigned":
    case "mission":
      if (missionId) return { deepLinkTarget: { screen: "mission", id: missionId } };
      return { internalPath: ROUTE_PATHS.dashboardOperations };
    default:
      break;
  }

  return null;
}

function extractPayloadFromNotification(notification: PushNotificationSchema): PushNotificationDeepLinkPayload | null {
  const base = normalizePushData(notification.data);
  const merged: Record<string, string> = { ...base };
  if (notification.link && typeof notification.link === "string" && notification.link.trim() !== "") {
    merged.link = notification.link.trim();
    if (notification.link.trim().startsWith("esamba://")) {
      merged.esambaUrl = notification.link.trim();
    }
  }
  return mapPushDataToDeepLinkPayload(merged);
}

export interface PushNotificationStartOptions {
  /** Token FCM (Android) ou jeton retourné par l’enregistrement (voir doc Capacitor pour iOS). */
  onRegistration?: (token: Token) => void;
  onRegistrationError?: (error: { error: string }) => void;
  /** Notification reçue en avant-plan (app ouverte). */
  onPushNotificationReceived?: (notification: PushNotificationSchema) => void;
  /** Après navigation depuis un tap sur notification. */
  onNavigateFromNotification?: (payload: PushNotificationDeepLinkPayload) => void;
}

/**
 * Service push Capacitor : permission, token, écoute, routage via `DeepLinkService`.
 */
export class PushNotificationService {
  private lastToken: string | null = null;
  private handles: PluginListenerHandle[] = [];
  private started = false;

  getLastToken(): string | null {
    return this.lastToken;
  }

  async checkPermissions(): Promise<PermissionStatus> {
    return PushNotifications.checkPermissions();
  }

  async requestPermissions(): Promise<PermissionStatus> {
    return PushNotifications.requestPermissions();
  }

  /**
   * Enregistre le device auprès d’APNs / FCM (sans nouvelle demande de permission si déjà accordée).
   */
  async register(): Promise<void> {
    await PushNotifications.register();
  }

  dispatchNavigationFromData(data: unknown, options?: { onNavigate?: (p: PushNotificationDeepLinkPayload) => void }): boolean {
    const normalized = normalizePushData(data);
    const payload = mapPushDataToDeepLinkPayload(normalized);
    if (!payload) {
      pushLogInfo("Aucune cible de navigation dans le payload push", { keys: Object.keys(normalized) });
      return false;
    }
    deepLinkService.dispatchFromPushPayload(payload);
    options?.onNavigate?.(payload);
    return true;
  }

  /**
   * Démarre l’écoute native : demande la permission, enregistre les listeners, appelle `register()`.
   * Ne fait rien sur le web.
   */
  async start(options?: PushNotificationStartOptions): Promise<() => Promise<void>> {
    if (!isNativePlatform()) {
      pushLogDebug("Push ignoré (plateforme non native)", { platform: Capacitor.getPlatform() });
      return async () => {};
    }

    if (this.started) {
      pushLogInfo("Push déjà démarré — ignorer un second start()");
      return async () => {};
    }

    await this.ensureDefaultAndroidChannel();

    const perm = await PushNotifications.requestPermissions();
    pushLogInfo("Permission push", { receive: perm.receive });

    if (perm.receive !== "granted") {
      return async () => {};
    }

    const add = async (h: Promise<PluginListenerHandle>) => {
      this.handles.push(await h);
    };

    await add(
      PushNotifications.addListener("registration", (token) => {
        this.lastToken = token.value;
        pushLogInfo("Token device enregistré", { length: token.value.length });
        options?.onRegistration?.(token);
      }),
    );

    await add(
      PushNotifications.addListener("registrationError", (err) => {
        pushLogInfo("Erreur enregistrement push", { error: err.error });
        options?.onRegistrationError?.(err);
      }),
    );

    await add(
      PushNotifications.addListener("pushNotificationReceived", (notification) => {
        pushLogDebug("Notification reçue (avant-plan possible)", {
          id: notification.id,
          title: notification.title,
        });
        options?.onPushNotificationReceived?.(notification);
      }),
    );

    await add(
      PushNotifications.addListener("pushNotificationActionPerformed", (action: ActionPerformed) => {
        pushLogInfo("Action notification (tap)", { actionId: action.actionId });
        const payload = extractPayloadFromNotification(action.notification);
        if (payload) {
          deepLinkService.dispatchFromPushPayload(payload);
          options?.onNavigateFromNotification?.(payload);
        } else {
          pushLogInfo("Tap notification sans payload routable", {
            dataKeys: Object.keys(normalizePushData(action.notification.data)),
          });
        }
      }),
    );

    await PushNotifications.register();
    this.started = true;

    return async () => {
      await this.stop();
    };
  }

  async stop(): Promise<void> {
    for (const h of this.handles) {
      try {
        await h.remove();
      } catch {
        /* ignore */
      }
    }
    this.handles = [];
    this.started = false;
  }

  /** Canal Android par défaut (API 26+) — id référencé côté Firebase si besoin. */
  private async ensureDefaultAndroidChannel(): Promise<void> {
    if (Capacitor.getPlatform() !== "android") return;
    try {
      await PushNotifications.createChannel({
        id: "esamba_default",
        name: "Flotte E-Samba",
        description: "Alertes et rappels flotte",
        importance: 4,
        visibility: 1,
        sound: undefined,
      });
      pushLogDebug("Canal Android default créé ou mis à jour", { id: "esamba_default" });
    } catch (e) {
      pushLogInfo("Création canal Android ignorée ou échouée", {
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }
}

export const pushNotificationService = new PushNotificationService();
