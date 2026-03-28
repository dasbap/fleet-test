import { usePushNotifications } from "@/hooks/usePushNotifications";

/**
 * Monte le flux push Capacitor (permission, token, listeners) une fois l’app prête.
 * La navigation au tap est gérée par `pushNotificationService` → `deepLinkService` → `DeepLinkListener`.
 */
export function PushNotificationBridge() {
  usePushNotifications({ enabled: true });
  return null;
}
