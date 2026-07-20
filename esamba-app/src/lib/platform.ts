import { Capacitor } from '@capacitor/core'

/** WebView Capacitor (Android / iOS). */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform()
}
