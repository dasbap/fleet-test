import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useRegisterNotificationToken } from "@/hooks/useNotifications";
import { getCapacitorPlatform, isNativePlatform } from "@/lib/platform";
import type { NotificationPlatform } from "@/repositories/notification.repository";

function resolveNotificationPlatform(): NotificationPlatform {
  if (!isNativePlatform()) return "web";
  const current = getCapacitorPlatform();
  if (current === "ios") return "ios";
  if (current === "android") return "android";
  return "web";
}

/**
 * Monte le flux push Capacitor (permission, token, listeners) une fois l’utilisateur connecté.
 * Enregistre automatiquement le token FCM dans `notification_tokens`.
 * La navigation au tap est gérée par `pushNotificationService` → `deepLinkService` → `DeepLinkListener`.
 *
 * Monté dans `AuthProviderLayout` (pas `App.tsx`) pour accéder à `useAuth` avec React Router.
 */
export function PushNotificationBridge() {
  const { user } = useAuth();
  const userId = user?.id;
  const { deviceToken } = usePushNotifications({ enabled: !!userId });
  const { mutateAsync: registerToken } = useRegisterNotificationToken();
  const lastRegisteredRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) {
      lastRegisteredRef.current = null;
      return;
    }
    if (!deviceToken) return;

    const registrationKey = `${userId}:${deviceToken}`;
    if (lastRegisteredRef.current === registrationKey) return;

    const platform = resolveNotificationPlatform();
    if (platform === "web") return;

    void registerToken({
      userId,
      token: deviceToken,
      platform,
      deviceInfo: {
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
      },
    })
      .then(() => {
        lastRegisteredRef.current = registrationKey;
      })
      .catch(() => {
        // Le hook affiche déjà un toast d’erreur.
      });
  }, [userId, deviceToken, registerToken]);

  return null;
}
