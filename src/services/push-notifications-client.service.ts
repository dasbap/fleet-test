/**
 * Service push unifié — Capacitor natif uniquement.
 *
 * Le SDK Firebase JS a été retiré : sur Android/iOS la couche FCM est gérée
 * nativement par @capacitor/push-notifications (aucun SDK Firebase côté JS
 * n'est nécessaire pour les plates-formes mobiles).
 *
 * Web browser : le push navigateur (FCM web push / VAPID) est désactivé.
 * L'app étant ciblée sur mobile natif, ce cas d'usage est marginal ; les
 * sept variables VITE_FIREBASE_* peuvent être supprimées de l'environnement.
 */

import { isNativePlatform } from "@/lib/platform";
import { pushNotificationService } from "@/services/push-notification.service";

type NotificationPlatform = "web" | "ios" | "android";

interface RequestTokenOptions {
  platform?: NotificationPlatform;
}

type ForegroundMessageCallback = (payload: { notification?: { title?: string; body?: string } }) => void;

class NotificationsClientService {
  /**
   * Demande la permission et retourne le token FCM.
   * — Natif (Android/iOS) : délègue à PushNotificationService via Capacitor.
   * — Web : renvoie null (push navigateur non supporté sans Firebase SDK).
   */
  async requestPermissionAndGetToken(options: RequestTokenOptions = {}): Promise<string | null> {
    const platform: NotificationPlatform =
      options.platform ?? (isNativePlatform() ? "android" : "web");

    if (platform === "web" && !isNativePlatform()) {
      // Push navigateur désactivé (Firebase SDK supprimé).
      return null;
    }

    // iOS ou Android : utilise le service natif Capacitor.
    const existing = pushNotificationService.getLastToken();
    if (existing) return existing;

    await pushNotificationService.start({});
    return pushNotificationService.getLastToken();
  }

  /**
   * Souscrit aux messages reçus en avant-plan.
   * — Natif : géré par pushNotificationService (listeners Capacitor).
   * — Web : no-op (Firebase SDK supprimé).
   */
  async subscribeToForegroundMessages(
    _callback: ForegroundMessageCallback,
  ): Promise<() => void> {
    // Les notifications avant-plan sur natif sont gérées par les listeners
    // déclarés dans PushNotificationService.start().
    // Sur web, aucun listener n'est disponible sans le SDK Firebase.
    return () => {};
  }
}

export const notificationsClientService = new NotificationsClientService();
