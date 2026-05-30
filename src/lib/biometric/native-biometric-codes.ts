/**
 * Codes d'erreur alignés sur `BiometricAuthError` du plugin @capgo/capacitor-native-biometric.
 * Fichier local pour éviter un import statique du plugin (chunk web + import dynamique dans le service).
 */
export const NativeBiometricAuthError = {
  AUTHENTICATION_FAILED: 10,
  USER_CANCEL: 11,
  USER_FALLBACK: 12,
  SYSTEM_CANCEL: 13,
} as const;
