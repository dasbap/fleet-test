/**
 * Registre des plugins Capacitor prévus — V1 (préparation intégration native).
 * Les paquets sont listés dans package.json ; synchroniser avec `npx cap sync`.
 */

export type NativePluginId =
  | "camera"
  | "geolocation"
  | "filesystem"
  | "haptics"
  | "preferences"
  | "share"
  | "app"
  | "push_notifications"
  | "native_biometric";

export interface NativePluginEntry {
  id: NativePluginId;
  npmPackage: string;
  /** Usage prévu dans Flotte E-Samba */
  purpose: string;
}

export const NATIVE_PLUGINS_REGISTRY: readonly NativePluginEntry[] = [
  {
    id: "camera",
    npmPackage: "@capacitor/camera",
    purpose: "Photos incidents, pièces jointes terrain",
  },
  {
    id: "geolocation",
    npmPackage: "@capacitor/geolocation",
    purpose: "Position véhicule / mission",
  },
  {
    id: "filesystem",
    npmPackage: "@capacitor/filesystem",
    purpose: "Cache pièces lourdes (évolution)",
  },
  {
    id: "haptics",
    npmPackage: "@capacitor/haptics",
    purpose: "Retour tactile lors des actions critiques (scan, alertes)",
  },
  {
    id: "preferences",
    npmPackage: "@capacitor/preferences",
    purpose: "Stockage clé-valeur local (préférences, jetons cache)",
  },
  {
    id: "share",
    npmPackage: "@capacitor/share",
    purpose: "Partage rapports / liens",
  },
  {
    id: "app",
    npmPackage: "@capacitor/app",
    purpose: "Deep links, retour avant-plan (déjà utilisé)",
  },
  {
    id: "push_notifications",
    npmPackage: "@capacitor/push-notifications",
    purpose: "Alertes opérationnelles (bridge existant côté app)",
  },
  {
    id: "native_biometric",
    npmPackage: "@capgo/capacitor-native-biometric",
    purpose: "Déverrouillage biométrique + stockage sécurisé du jeton de session (terrain)",
  },
] as const;
