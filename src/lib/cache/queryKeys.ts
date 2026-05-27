/**
 * Clés de cache TanStack Query centralisées.
 * Remplace les strings littérales éparpillées dans les hooks.
 * Usage : queryClient.invalidateQueries({ queryKey: queryKeys.fleet.metrics(fleetId) })
 */
export const queryKeys = {
  // ── Auth / Bootstrap ────────────────────────────────────────────────────────
  auth: {
    bootstrap:   ()                  => ['auth', 'bootstrap']            as const,
    session:     ()                  => ['auth', 'session']              as const,
    profile:     (userId: string)    => ['auth', 'profile', userId]      as const,
  },

  // ── Flotte ─────────────────────────────────────────────────────────────────
  fleet: {
    all:         ()                  => ['fleet']                        as const,
    metrics:     (fleetId: string)   => ['fleet', 'metrics', fleetId]   as const,
    billing:     (fleetId: string)   => ['fleet', 'billing', fleetId]   as const,
    activation:  (fleetId: string)   => ['fleet', 'activation', fleetId] as const,
    snapshots:   (fleetId: string)   => ['fleet', 'snapshots', fleetId] as const,
  },

  // ── Dashboard ───────────────────────────────────────────────────────────────
  dashboard: {
    stats:       (fleetId: string)   => ['dashboard', 'stats', fleetId]    as const,
    kpis:        (fleetId: string)   => ['dashboard', 'kpis', fleetId]     as const,
    alerts:      (orgId: string)     => ['dashboard', 'alerts', orgId]     as const,
    activity:    (fleetId: string)   => ['dashboard', 'activity', fleetId] as const,
  },

  // ── Véhicules ───────────────────────────────────────────────────────────────
  vehicles: {
    all:         (fleetId: string)   => ['vehicles', fleetId]              as const,
    detail:      (vehicleId: string) => ['vehicles', 'detail', vehicleId]  as const,
    overview:    (fleetId: string)   => ['vehicles', 'overview', fleetId]  as const,
  },

  // ── Conducteurs ─────────────────────────────────────────────────────────────
  drivers: {
    all:         (fleetId: string)   => ['drivers', fleetId]               as const,
    scores:      (fleetId: string)   => ['drivers', 'scores', fleetId]     as const,
    topScores:   (fleetId: string)   => ['drivers', 'top-scores', fleetId] as const,
    score:       (driverId: string, fleetId: string) =>
                                        ['drivers', 'score', driverId, fleetId] as const,
    history:     (driverId: string)  => ['drivers', 'history', driverId]   as const,
    shifts:      (driverId: string)  => ['drivers', 'shifts', driverId]    as const,
  },

  // ── Adhésions ───────────────────────────────────────────────────────────────
  memberships: {
    fleet:       (fleetId: string)   => ['memberships', 'fleet', fleetId]  as const,
    user:        (userId: string)    => ['memberships', 'user', userId]    as const,
    active:      (fleetId: string)   => ['memberships', 'active', fleetId] as const,
  },

  // ── Affectations ─────────────────────────────────────────────────────────────
  assignments: {
    fleet:       (fleetId: string)   => ['assignments', 'fleet', fleetId]  as const,
    driver:      (driverId: string)  => ['assignments', 'driver', driverId] as const,
    active:      (fleetId: string)   => ['assignments', 'active', fleetId] as const,
  },

  // ── Alertes ─────────────────────────────────────────────────────────────────
  alerts: {
    list:        (fleetId: string)   => ['alerts', fleetId]                as const,
    vehicle:     (vehicleId: string, fleetId: string) =>
                                        ['alerts', 'vehicle', vehicleId, fleetId] as const,
    detail:      (alertId: string)   => ['alerts', 'detail', alertId]      as const,
    comments:    (alertId: string)   => ['alerts', 'comments', alertId]    as const,
  },

  // ── Maintenance ──────────────────────────────────────────────────────────────
  maintenance: {
    all:         (fleetId: string)   => ['maintenance', fleetId]           as const,
    vehicle:     (vehicleId: string) => ['maintenance', 'vehicle', vehicleId] as const,
    predictions: (vehicleId: string) => ['maintenance', 'predictions', vehicleId] as const,
  },

  // ── Créneaux / clôtures ──────────────────────────────────────────────────────
  shifts: {
    active:      (fleetId: string)   => ['shifts', 'active', fleetId]     as const,
    driver:      (driverId: string)  => ['shifts', 'driver', driverId]    as const,
    pending:     (fleetId: string)   => ['shifts', 'pending', fleetId]    as const,
  },

  // ── Onboarding ───────────────────────────────────────────────────────────────
  onboarding: {
    progress:    (orgId: string)     => ['onboarding', 'progress', orgId] as const,
  },

  // ── Billing ──────────────────────────────────────────────────────────────────
  billing: {
    plan:        (fleetId: string)   => ['billing', 'plan', fleetId]      as const,
    history:     (fleetId: string)   => ['billing', 'history', fleetId]   as const,
    subscription:(fleetId: string)   => ['billing', 'subscription', fleetId] as const,
  },

  // ── Codes d'accès ────────────────────────────────────────────────────────────
  accessCodes: {
    all:         ()                  => ['access-codes']                   as const,
    detail:      (code: string)      => ['access-codes', 'detail', code]   as const,
  },
} as const;
