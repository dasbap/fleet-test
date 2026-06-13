import { useCallback, useEffect, useState } from 'react'
import type { PermissionState, PluginListenerHandle } from '@capacitor/core'
import { FirebaseMessaging } from '@capacitor-firebase/messaging'
import { isNativePlatform } from '@/lib/platform'

export interface UsePushNotificationsOptions {
  /** Si false, n'initialise pas FCM (ex. utilisateur déconnecté). */
  enabled?: boolean
}

/**
 * Initialise FCM au démarrage : permission, token, renouvellement du token.
 * Sur le web, ne fait rien (états à null).
 */
export function usePushNotifications(options?: UsePushNotificationsOptions) {
  const enabled = options?.enabled ?? true
  const [permission, setPermission] = useState<PermissionState | null>(null)
  const [deviceToken, setDeviceToken] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !isNativePlatform()) return

    let cancelled = false
    let tokenListener: PluginListenerHandle | undefined

    void (async () => {
      try {
        const perm = await FirebaseMessaging.requestPermissions()
        if (!cancelled) setPermission(perm.receive)

        const { token } = await FirebaseMessaging.getToken()
        if (!cancelled) setDeviceToken(token)

        tokenListener = await FirebaseMessaging.addListener('tokenReceived', (event) => {
          if (!cancelled) setDeviceToken(event.token)
        })
      } catch {
        if (!cancelled) setDeviceToken(null)
      }
    })()

    return () => {
      cancelled = true
      void tokenListener?.remove()
      void FirebaseMessaging.removeAllListeners()
    }
  }, [enabled])

  const refreshPermission = useCallback(async () => {
    const status = await FirebaseMessaging.checkPermissions()
    setPermission(status.receive)
    return status
  }, [])

  return {
    permission,
    deviceToken,
    refreshPermission,
  }
}
