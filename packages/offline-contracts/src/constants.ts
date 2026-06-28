/** Version du schéma des jobs offline — incrémenter si le payload change. */
export const OFFLINE_QUEUE_SCHEMA_VERSION = 1;

export const OFFLINE_QUEUE_MAX_SIZE = 200;

export const OFFLINE_QUEUE_MAX_ATTEMPTS = 5;

/** TTL cache licence QR (7 jours). */
export const QR_LICENSE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Taille max journal local (entrées). */
export const ACTION_JOURNAL_MAX_ENTRIES = 500;

/** Seuil reprise jobs bloqués en syncing (ms). */
export const SYNCING_STUCK_THRESHOLD_MS = 60_000;
