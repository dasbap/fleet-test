/**
 * Types — Auth téléphone OTP E-Samba
 */

// ─── Pays CEMAC + extensions ───────────────────────────────────────────────────

export interface AfricanCountry {
  code:       string;  // ISO 3166-1 alpha-2 (ex: 'CM')
  dialCode:   string;  // Préfixe international (ex: '+237')
  name:       string;  // Nom en français
  nameEn:     string;  // Nom en anglais
  flag:       string;  // Emoji drapeau
  /** Longueur du numéro local (sans indicatif) */
  localLength: number;
  /** Préfixes des numéros mobiles (ex: ['6', '2']) */
  mobilePrefixes: string[];
  /** Opérateurs principaux */
  operators: string[];
}

// ─── État du flux OTP ─────────────────────────────────────────────────────────

export type PhoneAuthStep =
  | 'idle'         // Formulaire téléphone vide
  | 'sending'      // Envoi OTP en cours
  | 'otp_sent'     // OTP envoyé, saisie du code attendue
  | 'verifying'    // Vérification OTP en cours
  | 'success'      // Auth réussie
  | 'error';       // Erreur (message dans errorMessage)

export interface PhoneAuthState {
  step:           PhoneAuthStep;
  phone:          string;   // E164
  errorMessage:   string | null;
  /** Secondes restantes avant de pouvoir renvoyer */
  cooldownSeconds: number;
  /** Nombre de tentatives de vérification échouées */
  verifyAttempts: number;
  /** Nombre d'envois OTP pour ce numéro dans la session */
  sendCount: number;
  /** Méthode d'envoi utilisée */
  channel: 'sms' | 'whatsapp';
}

// ─── Résultats ────────────────────────────────────────────────────────────────

export interface OtpSendResult {
  ok:      boolean;
  reason?: 'rate_limited' | 'invalid_phone' | 'provider_error' | 'unknown';
  message?: string;
  /** Délai avant prochain envoi possible (secondes) */
  retryAfter?: number;
}

export interface OtpVerifyResult {
  ok:      boolean;
  reason?: 'invalid_otp' | 'expired_otp' | 'too_many_attempts' | 'unknown';
  message?: string;
}

// ─── Auth hybride ─────────────────────────────────────────────────────────────

export type AuthMethod = 'phone' | 'email';

export interface HybridAuthState {
  method:      AuthMethod;
  isLoading:   boolean;
  error:       string | null;
}
