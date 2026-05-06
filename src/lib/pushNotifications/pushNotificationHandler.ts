import { PushNotifications } from "@capacitor/push-notifications";
import { isNativePlatform } from "@/lib/platform";
import {
  ESAMBA_DEEP_LINK_WINDOW_EVENT,
  ESAMBA_INTERNAL_PATH_WINDOW_EVENT,
  type EsambaDeepLinkEventDetail,
  type EsambaInternalPathEventDetail,
} from "@/lib/deepLinks/deepLinkConfig";

/**
 * Structure attendue dans `notification.data` des payloads push.
 *
 * Convention backend :
 *   - `path`  : chemin SPA direct   (ex. "/dashboard/alerts/uuid")
 *   - `url`   : deep link complet   (ex. "esamba://vehicule/uuid")
 *               ou URL publique     (ex. "https://www.e-samba.com/vehicule/uuid")
 *
 * `path` est prioritaire sur `url` si les deux sont présents.
 */
interface PushPayload {
  path?: string;
  url?: string;
  [key: string]: unknown;
}

function dispatchInternalPath(path: string): void {
  window.dispatchEvent(
    new CustomEvent<EsambaInternalPathEventDetail>(ESAMBA_INTERNAL_PATH_WINDOW_EVENT, {
      detail: { path },
    }),
  );
}

function dispatchDeepLinkUrl(url: string): void {
  window.dispatchEvent(
    new CustomEvent<EsambaDeepLinkEventDetail>(ESAMBA_DEEP_LINK_WINDOW_EVENT, {
      detail: { url },
    }),
  );
}

function handlePushPayload(data: PushPayload): void {
  // Priorité 1 : chemin SPA direct
  if (typeof data.path === "string" && data.path.startsWith("/")) {
    dispatchInternalPath(data.path);
    return;
  }
  // Priorité 2 : URL deep link ou publique
  if (typeof data.url === "string" && data.url.length > 0) {
    dispatchDeepLinkUrl(data.url);
  }
}

/**
 * Demande la permission et enregistre les listeners push Capacitor.
 * A appeler une seule fois au montage (dans DeepLinkListener).
 * Retourne une fonction de nettoyage.
 */
export async function registerPushNotificationListeners(): Promise<() => void> {
  if (!isNativePlatform()) return () => undefined;

  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== "granted") return () => undefined;

  await PushNotifications.register();

  // Tap sur une notification (app en arriere-plan ou fermee)
  const actionHandle = await PushNotifications.addListener(
    "pushNotificationActionPerformed",
    (action) => {
      const data = (action.notification?.data ?? {}) as PushPayload;
      handlePushPayload(data);
    },
  );

  // Notification recue en premier plan : pas de navigation automatique
  const receivedHandle = await PushNotifications.addListener(
    "pushNotificationReceived",
    (_notification) => {
      // Intentionnellement vide
    },
  );

  return () => {
    void actionHandle.remove();
    void receivedHandle.remove();
  };
}
