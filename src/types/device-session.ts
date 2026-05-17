/**
 * Types — Gestion des appareils connectés E-Samba.
 */

export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'unknown';
export type SessionEventType = 'login' | 'logout' | 'revoked' | 'trusted' | 'untrusted' | 'activity' | 'suspicious';
export type SecurityNotificationType = 'new_device' | 'suspicious_location' | 'session_revoked' | 'trusted_added' | 'mass_revoke';

// ── Entités ───────────────────────────────────────────────────────────────────

export interface UserSession {
  id:                 string;
  userId:             string;
  deviceFingerprint:  string;
  deviceName:         string;
  deviceType:         DeviceType;
  browser:            string;
  os:                 string;
  ipAddress:          string;
  city:               string;
  region:             string;
  countryCode:        string;
  countryName:        string;
  isCurrent:          boolean;
  isTrusted:          boolean;
  lastActiveAt:       string;
  createdAt:          string;
  revokedAt:          string | null;
}

export interface SessionEvent {
  id:         string;
  sessionId:  string;
  userId:     string;
  eventType:  SessionEventType;
  ipAddress:  string | null;
  meta:       Record<string, unknown> | null;
  createdAt:  string;
}

export interface SecurityNotification {
  id:         string;
  userId:     string;
  sessionId:  string | null;
  type:       SecurityNotificationType;
  title:      string;
  body:       string;
  isRead:     boolean;
  createdAt:  string;
}

// ── DB row → domaine ──────────────────────────────────────────────────────────

export function rowToSession(row: Record<string, unknown>): UserSession {
  return {
    id:                String(row.id),
    userId:            String(row.user_id),
    deviceFingerprint: String(row.device_fingerprint ?? ''),
    deviceName:        String(row.device_name ?? 'Appareil inconnu'),
    deviceType:        (row.device_type as DeviceType) ?? 'unknown',
    browser:           String(row.browser ?? 'Inconnu'),
    os:                String(row.os ?? 'Inconnu'),
    ipAddress:         String(row.ip_address ?? ''),
    city:              String(row.city ?? ''),
    region:            String(row.region ?? ''),
    countryCode:       String(row.country_code ?? ''),
    countryName:       String(row.country_name ?? ''),
    isCurrent:         Boolean(row.is_current),
    isTrusted:         Boolean(row.is_trusted),
    lastActiveAt:      String(row.last_active_at),
    createdAt:         String(row.created_at),
    revokedAt:         row.revoked_at ? String(row.revoked_at) : null,
  };
}

export function rowToNotification(row: Record<string, unknown>): SecurityNotification {
  return {
    id:        String(row.id),
    userId:    String(row.user_id),
    sessionId: row.session_id ? String(row.session_id) : null,
    type:      row.type as SecurityNotificationType,
    title:     String(row.title),
    body:      String(row.body),
    isRead:    Boolean(row.is_read),
    createdAt: String(row.created_at),
  };
}

// ── Labels UI ─────────────────────────────────────────────────────────────────

export const NOTIFICATION_LABELS: Record<SecurityNotificationType, string> = {
  new_device:           'Nouvelle connexion',
  suspicious_location:  'Localisation inhabituelle',
  session_revoked:      'Session déconnectée',
  trusted_added:        'Appareil de confiance ajouté',
  mass_revoke:          'Appareils déconnectés',
};
