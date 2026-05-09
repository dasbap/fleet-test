import { useCallback, useEffect, useState } from "react";
import type { PermissionState } from "@capacitor/core";
import { pushNotificationService } from "@/services/push-notification.service";
import { isNativePlatform } from "@/lib/platform";

export interface UsePushNotificationsOptions {
  /** Si false, n’initialise pas le plugin (ex. utilisateur déconnecté). */
  enabled?: boolean;
}

/**
 * Branche le service push natif : permission, token, écoute des événements.
 * Sur le web, ne fait rien (états restent à null).
 */
export function usePushNotifications(options?: UsePushNotificationsOptions) {
  const enabled = options?.enabled ?? true;
  const [permission, setPermission] = useState<PermissionState | null>(null);
  const [deviceToken, setDeviceToken] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !isNativePlatform()) return;

    let cancelled = false;
    let teardown: (() => Promise<void>) | undefined;

    void (async () => {
      const initial = await pushNotificationService.checkPermissions();
      if (!cancelled) setPermission(initial.receive);

      teardown = await pushNotificationService.start({
        onRegistration: (token) => {
          if (!cancelled) setDeviceToken(token.value);
        },
        onRegistrationError: () => {
          if (!cancelled) setDeviceToken(null);
        },
      });

      const after = await pushNotificationService.checkPermissions();
      if (!cancelled) setPermission(after.receive);
    })();

    return () => {
      cancelled = true;
      void teardown?.();
      void pushNotificationService.stop();
    };
  }, [enabled]);

  const refreshPermission = useCallback(async () => {
    const status = await pushNotificationService.checkPermissions();
    setPermission(status.receive);
    return status;
  }, []);

  return {
    permission,
    deviceToken,
    refreshPermission,
  };
}
