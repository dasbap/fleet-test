import { Capacitor } from "@capacitor/core";

/** True lorsque l’app tourne dans le conteneur natif Capacitor (iOS / Android). */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/** Plateforme courante : web, ios, android. */
export function getCapacitorPlatform(): string {
  return Capacitor.getPlatform();
}
