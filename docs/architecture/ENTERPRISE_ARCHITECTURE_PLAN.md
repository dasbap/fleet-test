# E-Samba — Plan Architecture Enterprise
> Stack réelle : **Vite + React Router v6 + TanStack Query + Supabase + Vercel SPA**
> Référence : `CURRENT_ARCHITECTURE.md`
> Objectif : LCP < 2.5s, TTFB < 800ms, schéma stable, zéro drift, scalable multi-flotte

---

## Diagnostic rapide

| Problème | Cause racine | Impact |
|---|---|---|
| LCP ~5s | Tout est client-side, bundle non splitté, pas de cache | UX catastrophique |
| Skeleton permanent | Waterfalls auth→profil→flotte→données | Dashboard inutilisable |
| RPC lentes | Calculs en temps réel, pas de matérialized views | Latence cumulative |
| Drift schéma | Pas de contrat type↔SQL, select("*") partout | Erreurs runtime |
| Re-fetch excessif | Pas de staleTime, invalidation trop large | Supabase saturé |
| Auth boucles | Double fetch profil, profil attendu avant routing | Dashboard bloqué |
| Multi-tenant fragile | RLS incomplètes, policies manquantes | Risque fuite data |

---

## PHASE 1 — Stabilisation backend (semaine 1-2)

> **Ce qui est déjà fait** : migrations 02→06, RLS canoniques, triggers, RPCs v2.
> Ce qui reste.

### 1.1 Materialized Views analytics

Remplacer les calculs temps réel par des vues matérialisées rafraîchies toutes les heures.

```sql
-- Vue matérialisée : métriques flotte agrégées par jour
CREATE MATERIALIZED VIEW public.mv_fleet_daily_metrics AS
SELECT
  av.fleet_id,
  date_trunc('day', cc.started_at)        AS day,
  COUNT(DISTINCT av.driver_user_id)        AS active_drivers,
  COUNT(cc.id)                             AS total_shifts,
  COUNT(cl.id)                             AS closed_shifts,
  COALESCE(SUM(cl.revenue_gap), 0)         AS total_revenue_gap,
  COALESCE(AVG(
    EXTRACT(EPOCH FROM (cl.created_at - cc.ended_at)) / 60
  ), 0)                                    AS avg_closure_delay_min,
  COUNT(i.id)                              AS incident_count
FROM public.creneaux_conducteurs cc
JOIN public.affectations_vehicules av ON av.id = cc.assignment_id
LEFT JOIN public.clotures_creneaux cl  ON cl.shift_id = cc.id
LEFT JOIN public.incidents i
  ON i.driver_user_id = av.driver_user_id
  AND i.created_at::date = cc.started_at::date
WHERE cc.started_at >= now() - interval '90 days'
GROUP BY av.fleet_id, date_trunc('day', cc.started_at)
WITH DATA;

CREATE UNIQUE INDEX ON public.mv_fleet_daily_metrics (fleet_id, day);
CREATE INDEX ON public.mv_fleet_daily_metrics (fleet_id, day DESC);

-- Refresh via cron Supabase (pg_cron) ou Edge Function
-- SELECT cron.schedule('refresh-fleet-metrics', '0 * * * *',
--   'REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_fleet_daily_metrics');
```

```sql
-- Vue matérialisée : scores conducteurs snapshot quotidien
CREATE MATERIALIZED VIEW public.mv_driver_score_snapshots AS
SELECT
  driver_user_id,
  fleet_id,
  score_total,
  score_level,
  financial_score,
  incidents_score,
  closure_delay_score,
  shift_discipline_score,
  last_calculated_at,
  now() AS snapshot_at
FROM public.scores_conducteurs
WITH DATA;

CREATE UNIQUE INDEX ON public.mv_driver_score_snapshots (driver_user_id, fleet_id);
```

### 1.2 Cache table agrégats

```sql
-- Table de cache des métriques dashboard (TTL géré applicativement)
CREATE TABLE IF NOT EXISTS public.fleet_metrics_cache (
  fleet_id        uuid PRIMARY KEY REFERENCES public.flottes(id) ON DELETE CASCADE,
  metrics         jsonb NOT NULL DEFAULT '{}',
  computed_at     timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL DEFAULT now() + interval '1 hour'
);

ALTER TABLE public.fleet_metrics_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY fleet_metrics_cache_select ON public.fleet_metrics_cache
  FOR SELECT TO authenticated
  USING (public.has_role(fleet_id, ARRAY['organizer','manager','driver']));
```

### 1.3 RPC allégées (lecture seule, STABLE)

```sql
-- Remplace fleet_activation_metrics — lit depuis la cache table si valide
CREATE OR REPLACE FUNCTION public.get_fleet_dashboard_metrics(p_fleet_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cache jsonb;
  v_result jsonb;
BEGIN
  -- Lecture cache si valide
  SELECT metrics INTO v_cache
  FROM public.fleet_metrics_cache
  WHERE fleet_id = p_fleet_id
    AND expires_at > now();

  IF v_cache IS NOT NULL THEN
    RETURN v_cache;
  END IF;

  -- Calcul depuis mv_ (rapide car pré-agrégé)
  SELECT jsonb_build_object(
    'fleet_id',          p_fleet_id,
    'period',            '30d',
    'total_shifts',      COALESCE(SUM(total_shifts), 0),
    'closed_shifts',     COALESCE(SUM(closed_shifts), 0),
    'revenue_gap',       COALESCE(SUM(total_revenue_gap), 0),
    'avg_closure_delay', COALESCE(ROUND(AVG(avg_closure_delay_min)::numeric, 1), 0),
    'incident_count',    COALESCE(SUM(incident_count), 0),
    'computed_at',       now()
  ) INTO v_result
  FROM public.mv_fleet_daily_metrics
  WHERE fleet_id = p_fleet_id
    AND day >= now() - interval '30 days';

  -- Mise en cache
  INSERT INTO public.fleet_metrics_cache (fleet_id, metrics, expires_at)
  VALUES (p_fleet_id, v_result, now() + interval '1 hour')
  ON CONFLICT (fleet_id) DO UPDATE SET
    metrics    = EXCLUDED.metrics,
    computed_at = now(),
    expires_at  = EXCLUDED.expires_at;

  RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_fleet_dashboard_metrics(uuid) TO authenticated;
```

### 1.4 Indexes manquants critiques

```sql
-- Creneaux par date (les plus lourdes)
CREATE INDEX IF NOT EXISTS idx_creneaux_started_at
  ON public.creneaux_conducteurs (started_at DESC);

CREATE INDEX IF NOT EXISTS idx_creneaux_assignment_started
  ON public.creneaux_conducteurs (assignment_id, started_at DESC);

-- Clotures par date
CREATE INDEX IF NOT EXISTS idx_clotures_created_at
  ON public.clotures_creneaux (created_at DESC);

-- Incidents par date + conducteur
CREATE INDEX IF NOT EXISTS idx_incidents_driver_date
  ON public.incidents (driver_user_id, created_at DESC);

-- Scores par flotte + niveau
CREATE INDEX IF NOT EXISTS idx_scores_fleet_level
  ON public.scores_conducteurs (fleet_id, score_level, score_total DESC);

-- Onboarding par statut
CREATE INDEX IF NOT EXISTS idx_onboarding_completed
  ON public.onboarding_progress (completed, updated_at DESC);
```

---

## PHASE 2 — Refactor Auth (semaine 2-3)

### 2.1 Problème actuel : waterfall auth

```
browser → Vite bundle (250kb+)
  → mount React
  → Auth check (Supabase)
  → fetch profil (SELECT *)
  → fetch flotte active
  → fetch adhésion
  → render dashboard
```

Résultat : 4-6 requêtes séquentielles avant le premier paint utile.

### 2.2 Solution : bootstrap unique + prefetch

```typescript
// src/lib/auth/bootstrap.ts
// UNE seule RPC pour tout charger au démarrage

export interface BootstrapData {
  user_id: string;
  email: string;
  full_name: string;
  universe: string;
  status: string;
  role: string;
  active_fleet_id: string | null;
  active_fleet_name: string | null;
  org_id: string | null;
  permissions: string[];
  onboarding_completed: boolean;
}
```

```sql
-- RPC bootstrap : tout en une requête, < 10ms
CREATE OR REPLACE FUNCTION public.get_user_bootstrap()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_profil   public.profils;
  v_adhesion public.flotte_adhesions;
  v_flotte   public.flottes;
BEGIN
  IF v_uid IS NULL THEN RETURN NULL; END IF;

  SELECT * INTO v_profil FROM public.profils WHERE user_id = v_uid LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'profil_manquant'); END IF;

  -- Prendre la première adhésion active (organizer > manager > driver)
  SELECT fa.* INTO v_adhesion
  FROM public.flotte_adhesions fa
  WHERE fa.user_id = v_uid AND fa.is_active = true
  ORDER BY
    CASE fa.role::text
      WHEN 'organizer' THEN 1
      WHEN 'manager'   THEN 2
      WHEN 'driver'    THEN 3
      ELSE 4
    END
  LIMIT 1;

  IF FOUND THEN
    SELECT * INTO v_flotte FROM public.flottes WHERE id = v_adhesion.fleet_id LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'user_id',              v_uid,
    'email',                v_profil.email,
    'full_name',            v_profil.full_name,
    'universe',             v_profil.universe,
    'status',               v_profil.status,
    'role',                 COALESCE(v_adhesion.role::text, v_profil.role::text),
    'active_fleet_id',      v_adhesion.fleet_id,
    'active_fleet_name',    v_flotte.name,
    'org_id',               v_flotte.org_id,
    'onboarding_completed', EXISTS(
      SELECT 1 FROM public.onboarding_progress op
      WHERE op.org_id = v_flotte.org_id AND op.completed = true
    )
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_user_bootstrap() TO authenticated;
```

```typescript
// src/lib/auth/useBootstrap.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { BootstrapData } from './bootstrap';

export function useBootstrap() {
  return useQuery({
    queryKey: ['bootstrap'],
    queryFn: async (): Promise<BootstrapData | null> => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return null;

      const { data, error } = await supabase.rpc('get_user_bootstrap');
      if (error) throw error;
      return data as BootstrapData;
    },
    staleTime: 5 * 60 * 1000,      // 5 min — ne re-fetch pas à chaque navigation
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });
}
```

### 2.3 Provider bootstrap (remplace AuthProvider + ProfileProvider + FleetProvider)

```typescript
// src/providers/BootstrapProvider.tsx
import { createContext, useContext, ReactNode } from 'react';
import { useBootstrap } from '@/lib/auth/useBootstrap';
import type { BootstrapData } from '@/lib/auth/bootstrap';

interface BootstrapContextValue {
  bootstrap: BootstrapData | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const BootstrapContext = createContext<BootstrapContextValue | null>(null);

export function BootstrapProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useBootstrap();

  return (
    <BootstrapContext.Provider value={{
      bootstrap: data ?? null,
      isLoading,
      isAuthenticated: !!data?.user_id,
    }}>
      {children}
    </BootstrapContext.Provider>
  );
}

export const useBootstrapContext = () => {
  const ctx = useContext(BootstrapContext);
  if (!ctx) throw new Error('useBootstrapContext hors BootstrapProvider');
  return ctx;
};
```

### 2.4 Supprimer les redirections en boucle

```typescript
// src/components/auth/ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useBootstrapContext } from '@/providers/BootstrapProvider';

interface Props {
  children: ReactNode;
  requireUniverse?: string[];
  requireRole?: string[];
}

export function ProtectedRoute({ children, requireUniverse, requireRole }: Props) {
  const { bootstrap, isLoading, isAuthenticated } = useBootstrapContext();
  const location = useLocation();

  if (isLoading) return <AppSkeleton />;
  if (!isAuthenticated) return <Navigate to="/auth" state={{ from: location }} replace />;

  if (requireUniverse && !requireUniverse.includes(bootstrap!.universe)) {
    return <Navigate to="/unauthorized" replace />;
  }
  if (requireRole && !requireRole.includes(bootstrap!.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
```

---

## PHASE 3 — Refactor Dashboard (semaine 3-4)

### 3.1 Architecture dashboard cible

```
DashboardPage (route lazy)
├── DashboardShell (wrapper statique, rendu immédiat)
│   ├── Sidebar      (données bootstrap — déjà en cache)
│   ├── Header       (données bootstrap — déjà en cache)
│   └── DashboardContent
│       ├── MetricsRow     ← Suspense + skeleton propre
│       ├── VehiclesWidget ← Suspense indépendant
│       ├── DriversWidget  ← Suspense indépendant
│       └── ActivityFeed   ← Lazy (sous le fold)
```

### 3.2 Lazy loading routes (code splitting)

```typescript
// src/app/routes/app.routes.tsx — pattern lazy existant à systématiser
import { lazy, Suspense } from 'react';

const DashboardPage    = lazy(() => import('@/pages/dashboard/DashboardPage'));
const VehiclesPage     = lazy(() => import('@/pages/vehicles/VehiclesPage'));
const DriversPage      = lazy(() => import('@/pages/drivers/DriversPage'));
const BillingPage      = lazy(() => import('@/pages/billing/BillingPage'));
const OnboardingWizard = lazy(() => import('@/components/onboarding/OnboardingWizard'));

// Chaque route dans son propre chunk — Vite split automatique
const routes = [
  {
    path: '/dashboard',
    element: (
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardPage />
      </Suspense>
    ),
  },
  // ...
];
```

### 3.3 Widgets indépendants avec staleTime agressif

```typescript
// src/hooks/dashboard/useFleetMetrics.ts
export function useFleetMetrics(fleetId: string) {
  return useQuery({
    queryKey: ['fleet-metrics', fleetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_fleet_dashboard_metrics', { p_fleet_id: fleetId });
      if (error) throw error;
      return data;
    },
    staleTime: 60 * 1000,       // 1 min — les métriques ne changent pas à la seconde
    placeholderData: (prev) => prev, // garde les données précédentes pendant le refetch
    enabled: !!fleetId,
  });
}

// src/hooks/dashboard/useTopDrivers.ts
export function useTopDrivers(fleetId: string, limit = 5) {
  return useQuery({
    queryKey: ['top-drivers', fleetId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_top_driver_scores', { p_fleet_id: fleetId, p_limit: limit });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,   // 5 min
    enabled: !!fleetId,
  });
}
```

### 3.4 Requêtes Supabase : bannir select("*")

**Règle** : toujours lister les colonnes. Jamais de `select("*")` en production.

```typescript
// INTERDIT
const { data } = await supabase.from('vehicules').select('*');

// CORRECT
const { data } = await supabase
  .from('vehicules')
  .select('id, registration, status, fleet_id, created_at')
  .eq('fleet_id', fleetId)
  .eq('status', 'active')
  .order('created_at', { ascending: false })
  .limit(20);
```

**ESLint rule** à ajouter dans `.eslintrc` :

```json
{
  "rules": {
    "no-restricted-syntax": [
      "error",
      {
        "selector": "CallExpression[callee.property.name='select'][arguments.0.value='*']",
        "message": "select('*') interdit — listez les colonnes explicitement"
      }
    ]
  }
}
```

### 3.5 Micro-skeletons par widget

```typescript
// src/components/ui/WidgetSkeleton.tsx
export function MetricCardSkeleton() {
  return (
    <div className="rounded-xl border p-4 animate-pulse">
      <div className="h-3 w-24 bg-muted rounded mb-2" />
      <div className="h-8 w-16 bg-muted rounded" />
    </div>
  );
}

// Usage dans le widget
function MetricsRow({ fleetId }: { fleetId: string }) {
  const { data, isLoading } = useFleetMetrics(fleetId);

  if (isLoading) return (
    <div className="grid grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)}
    </div>
  );

  return (
    <div className="grid grid-cols-4 gap-4">
      <MetricCard label="Créneaux 30j" value={data?.total_shifts} />
      <MetricCard label="Taux clôture" value={`${Math.round((data?.closed_shifts / data?.total_shifts) * 100)}%`} />
      <MetricCard label="Gap revenus" value={`${data?.revenue_gap} XAF`} />
      <MetricCard label="Incidents" value={data?.incident_count} />
    </div>
  );
}
```

---

## PHASE 4 — Analytics Scalable (semaine 4-5)

### 4.1 Architecture lecture/écriture séparée

```
Écriture (temps réel) :
  conducteur → cloture_creaneaux INSERT → trigger → invalidate cache

Lecture (agrégée) :
  dashboard → mv_fleet_daily_metrics (refresh horaire)
             → fleet_metrics_cache (TTL 1h, invalidé sur écriture critique)
             → scores_conducteurs (upsert par calculer_score_conducteur_v2)
```

### 4.2 Refresh automatique via Edge Function (cron)

```typescript
// supabase/functions/refresh-analytics/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // 1. Refresh materialized views
  await supabase.rpc('refresh_analytics_views');

  // 2. Recalculer scores conducteurs actifs (30 derniers jours)
  const { data: activeDrivers } = await supabase
    .from('affectations_vehicules')
    .select('driver_user_id, fleet_id')
    .eq('is_active', true);

  if (activeDrivers) {
    for (const { driver_user_id, fleet_id } of activeDrivers) {
      await supabase.rpc('calculer_score_conducteur_v2', {
        p_driver_user_id: driver_user_id,
        p_fleet_id: fleet_id,
      });
    }
  }

  return new Response(JSON.stringify({ ok: true, at: new Date().toISOString() }));
});
```

```sql
-- Fonction helper refresh
CREATE OR REPLACE FUNCTION public.refresh_analytics_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_fleet_daily_metrics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_driver_score_snapshots;

  -- Invalider les caches expirés
  DELETE FROM public.fleet_metrics_cache WHERE expires_at < now();
END;
$$;
REVOKE ALL ON FUNCTION public.refresh_analytics_views() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_analytics_views() TO service_role;
```

### 4.3 Snapshots journaliers (historique analytics)

```sql
CREATE TABLE IF NOT EXISTS public.fleet_daily_snapshots (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id    uuid NOT NULL REFERENCES public.flottes(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL,
  metrics     jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fleet_id, snapshot_date)
);

CREATE INDEX ON public.fleet_daily_snapshots (fleet_id, snapshot_date DESC);
ALTER TABLE public.fleet_daily_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY fds_select ON public.fleet_daily_snapshots
  FOR SELECT TO authenticated
  USING (public.has_role(fleet_id, ARRAY['organizer','manager']));
```

---

## PHASE 5 — Cache stratégique (semaine 5)

### 5.1 Stratégie TanStack Query par type de donnée

| Donnée | staleTime | gcTime | Invalidation |
|---|---|---|---|
| Bootstrap (profil+flotte) | 5 min | 30 min | Sur signout / changement rôle |
| Métriques dashboard | 1 min | 10 min | Sur action conducteur |
| Liste véhicules | 5 min | 30 min | Sur create/update véhicule |
| Liste conducteurs | 5 min | 30 min | Sur changement adhésion |
| Scores conducteurs | 10 min | 60 min | Sur calcul score |
| Onboarding progress | 30 s | 5 min | Sur chaque étape |
| Audit logs | 0 (always fresh) | 5 min | — |

### 5.2 Invalidation ciblée (pas de invalidateQueries trop large)

```typescript
// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,       // 1 min par défaut
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false, // évite les re-fetch inutiles en SPA
    },
  },
});

// Helpers d'invalidation ciblée
export const cacheKeys = {
  bootstrap:      () => ['bootstrap'] as const,
  fleetMetrics:   (fleetId: string) => ['fleet-metrics', fleetId] as const,
  vehicles:       (fleetId: string) => ['vehicles', fleetId] as const,
  drivers:        (fleetId: string) => ['drivers', fleetId] as const,
  topDrivers:     (fleetId: string) => ['top-drivers', fleetId] as const,
  onboarding:     (orgId: string) => ['onboarding', orgId] as const,
} as const;

// Après création d'un véhicule :
// queryClient.invalidateQueries({ queryKey: cacheKeys.vehicles(fleetId) });
// PAS queryClient.invalidateQueries() — trop large
```

### 5.3 Optimistic updates

```typescript
// src/hooks/vehicles/useCreateVehicle.ts
export function useCreateVehicle(fleetId: string) {
  return useMutation({
    mutationFn: async (payload: CreateVehiclePayload) => {
      const { data, error } = await supabase
        .from('vehicules')
        .insert({ ...payload, fleet_id: fleetId })
        .select('id, registration, status, fleet_id')
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async (payload) => {
      // Snapshot + update optimiste
      await queryClient.cancelQueries({ queryKey: cacheKeys.vehicles(fleetId) });
      const prev = queryClient.getQueryData(cacheKeys.vehicles(fleetId));

      queryClient.setQueryData(cacheKeys.vehicles(fleetId), (old: Vehicle[] = []) => [
        { id: 'temp-' + Date.now(), ...payload, fleet_id: fleetId, status: 'active' },
        ...old,
      ]);

      return { prev };
    },
    onError: (_, __, ctx) => {
      // Rollback sur erreur
      queryClient.setQueryData(cacheKeys.vehicles(fleetId), ctx?.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: cacheKeys.vehicles(fleetId) });
    },
  });
}
```

---

## PHASE 6 — Performance bundle Vite (semaine 6)

### 6.1 Configuration Vite optimisée

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Chunks manuels pour les dépendances lourdes
        manualChunks: {
          'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-query':    ['@tanstack/react-query'],
          'vendor-ui':       ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'vendor-charts':   ['recharts'],      // si utilisé
        },
      },
    },
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false, // désactiver en prod pour réduire la taille
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@supabase/supabase-js'],
  },
});
```

### 6.2 Preconnect + Resource hints (index.html)

```html
<!-- public/index.html -->
<head>
  <!-- Supabase API -->
  <link rel="preconnect" href="https://[PROJECT_REF].supabase.co" />
  <link rel="dns-prefetch" href="https://[PROJECT_REF].supabase.co" />

  <!-- Fonts si utilisées -->
  <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin />

  <!-- Préchargement du chunk principal -->
  <link rel="modulepreload" href="/src/main.tsx" />
</head>
```

### 6.3 Compression Vercel

```json
// vercel.json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/(.*)\\.js",
      "headers": [
        { "key": "Content-Encoding", "value": "br" }
      ]
    }
  ]
}
```

### 6.4 Vite bundle analyzer

```bash
npm install --save-dev rollup-plugin-visualizer
# Dans vite.config.ts :
# import { visualizer } from 'rollup-plugin-visualizer';
# plugins: [react(), visualizer({ open: true })]
# npm run build → ouvre stats.html
```

**Objectifs après optimisation :**

| Chunk | Avant | Cible |
|---|---|---|
| `index.js` | ~800kb | < 200kb |
| `vendor-react` | — | ~150kb |
| `vendor-supabase` | — | ~80kb |
| `vendor-query` | — | ~40kb |
| Chunks pages | — | < 50kb chacun |

---

## PHASE 7 — Monitoring & Observabilité (semaine 7)

### 7.1 Sentry déjà présent — à compléter

```typescript
// src/lib/monitoring/performance.ts
import * as Sentry from '@sentry/react';

// Mesure LCP
export function measureLCP() {
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lcp = entries[entries.length - 1];
      Sentry.setMeasurement('lcp', lcp.startTime, 'millisecond');
    });
    observer.observe({ entryTypes: ['largest-contentful-paint'] });
  }
}

// Mesure TTFB
export function measureTTFB() {
  const [navEntry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
  if (navEntry) {
    Sentry.setMeasurement('ttfb', navEntry.responseStart, 'millisecond');
  }
}

// Mesure durée RPC
export async function timedRpc<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const duration = performance.now() - start;
    Sentry.setMeasurement(`rpc.${name}`, duration, 'millisecond');
    if (duration > 2000) {
      Sentry.captureMessage(`RPC lente: ${name} (${Math.round(duration)}ms)`, 'warning');
    }
  }
}
```

### 7.2 Slow query detection Supabase

```sql
-- Activer dans Supabase Dashboard → Database → Extensions → pg_stat_statements
-- Puis requêter périodiquement :

SELECT
  LEFT(query, 100)  AS query_preview,
  calls,
  ROUND(mean_exec_time::numeric, 2) AS avg_ms,
  ROUND(total_exec_time::numeric, 2) AS total_ms,
  ROUND(stddev_exec_time::numeric, 2) AS stddev_ms
FROM pg_stat_statements
WHERE mean_exec_time > 100   -- > 100ms
  AND query NOT LIKE '%pg_stat%'
ORDER BY mean_exec_time DESC
LIMIT 20;
```

### 7.3 Edge Function health check

```typescript
// supabase/functions/health/index.ts
Deno.serve(async () => {
  const checks = {
    timestamp: new Date().toISOString(),
    supabase_rpc: false,
    mv_fleet_metrics: false,
  };

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { error: rpcError } = await supabase.rpc('is_platform_admin');
  checks.supabase_rpc = !rpcError;

  const { error: mvError } = await supabase
    .from('mv_fleet_daily_metrics')
    .select('fleet_id')
    .limit(1);
  checks.mv_fleet_metrics = !mvError;

  const allOk = Object.values(checks).every(v => v !== false);
  return new Response(JSON.stringify(checks), {
    status: allOk ? 200 : 503,
    headers: { 'Content-Type': 'application/json' },
  });
});
```

---

## PHASE 8 — Hardening Production (semaine 8)

### 8.1 Rate limiting sur RPCs sensibles

```sql
CREATE TABLE IF NOT EXISTS public.rpc_rate_limits (
  user_id     uuid NOT NULL REFERENCES auth.users(id),
  rpc_name    text NOT NULL,
  window_start timestamptz NOT NULL,
  call_count  integer NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, rpc_name, window_start)
);

CREATE OR REPLACE FUNCTION public.check_rpc_rate_limit(
  p_rpc_name text,
  p_max_calls integer DEFAULT 10,
  p_window_minutes integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_window timestamptz := date_trunc('minute', now());
  v_count integer;
BEGIN
  INSERT INTO public.rpc_rate_limits (user_id, rpc_name, window_start, call_count)
  VALUES (v_uid, p_rpc_name, v_window, 1)
  ON CONFLICT (user_id, rpc_name, window_start)
  DO UPDATE SET call_count = rpc_rate_limits.call_count + 1
  RETURNING call_count INTO v_count;

  IF v_count > p_max_calls THEN
    RAISE EXCEPTION 'rate_limit_exceeded: % appels/%min sur %', p_max_calls, p_window_minutes, p_rpc_name;
  END IF;
END;
$$;
```

### 8.2 Validation Zod sur toutes les mutations

```typescript
// src/lib/validation/vehicle.schema.ts
import { z } from 'zod';

export const CreateVehicleSchema = z.object({
  registration:   z.string().min(4).max(20).toUpperCase(),
  fleet_id:       z.string().uuid(),
  status:         z.enum(['active', 'inactive', 'maintenance', 'archived']).default('active'),
  make:           z.string().max(50).optional(),
  model:          z.string().max(50).optional(),
  year:           z.number().int().min(1990).max(new Date().getFullYear() + 1).optional(),
  fuel_type:      z.enum(['gasoline', 'diesel', 'electric', 'hybrid']).optional(),
});

export type CreateVehiclePayload = z.infer<typeof CreateVehicleSchema>;

// Dans le repository :
export async function createVehicle(payload: unknown) {
  const validated = CreateVehicleSchema.parse(payload); // throw ZodError si invalide
  const { data, error } = await supabase
    .from('vehicules')
    .insert(validated)
    .select('id, registration, status, fleet_id')
    .single();
  if (error) throw error;
  return data;
}
```

### 8.3 Multi-tenant hardening — colonnes manquantes interdites

```sql
-- Vérification régulière en CI/CD
-- Ajouter dans un job GitHub Actions ou Supabase cron :

DO $$
DECLARE
  v_tables_sans_rls text[];
BEGIN
  SELECT array_agg(relname) INTO v_tables_sans_rls
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND NOT c.relrowsecurity
    AND c.relname NOT IN ('schema_migrations'); -- exclusions volontaires

  IF v_tables_sans_rls IS NOT NULL THEN
    RAISE EXCEPTION 'Tables sans RLS détectées : %', v_tables_sans_rls;
  END IF;
END $$;
```

---

## A. Architecture cible complète

```
E-Samba SaaS (Vite SPA → évolue vers SSR optionnel)
│
├── Frontend (Vite + React + React Router v6)
│   ├── providers/
│   │   ├── BootstrapProvider    — auth + profil + flotte en 1 RPC
│   │   ├── QueryClientProvider  — TanStack Query config
│   │   └── ThemeProvider
│   ├── app/routes/              — lazy loading par feature
│   ├── pages/                   — pages composites
│   ├── features/                — domaines métier (vehicles, drivers, onboarding...)
│   │   └── [feature]/
│   │       ├── components/
│   │       ├── hooks/           — useQuery + useMutation ciblés
│   │       ├── repository.ts    — accès Supabase typé
│   │       ├── schema.ts        — Zod validation
│   │       └── types.ts
│   ├── lib/
│   │   ├── auth/                — bootstrap, session, guards
│   │   ├── supabase/            — client singleton
│   │   ├── validation/          — schemas Zod globaux
│   │   └── monitoring/          — Sentry, perf
│   └── components/ui/           — shadcn/ui + design system
│
├── Backend (Supabase)
│   ├── migrations/              — source de vérité SQL
│   ├── RPC SECURITY DEFINER     — bootstrap, onboarding, scores
│   ├── Materialized Views       — analytics pré-calculées
│   ├── Cache tables             — fleet_metrics_cache, daily_snapshots
│   ├── Triggers                 — updated_at, auto-profil, sync-email, audit
│   └── RLS canonique            — isolation par fleet_id + auth.uid()
│
├── Edge Functions
│   ├── refresh-analytics        — cron horaire MV + scores
│   ├── expire-accounts          — cron quotidien comptes temporaires
│   ├── clerk-webhook            — sync Clerk → Supabase Auth
│   └── health                  — endpoint monitoring
│
└── Vercel
    ├── SPA rewrite (*)→/index.html
    ├── Cache-Control immutable sur /assets/**
    └── Compression Brotli
```

---

## B. Structure dossier recommandée

```
src/
├── app/
│   ├── routes/
│   │   ├── app.routes.tsx       — routes lazy splitées
│   │   └── dashboard.routes.tsx
│   └── RootLayout.tsx
├── features/
│   ├── auth/
│   │   ├── hooks/useBootstrap.ts
│   │   ├── components/ProtectedRoute.tsx
│   │   └── providers/BootstrapProvider.tsx
│   ├── dashboard/
│   │   ├── hooks/useFleetMetrics.ts
│   │   ├── components/MetricsRow.tsx
│   │   ├── components/DriversWidget.tsx
│   │   └── DashboardPage.tsx
│   ├── vehicles/
│   │   ├── hooks/useVehicles.ts
│   │   ├── hooks/useCreateVehicle.ts
│   │   ├── repository.ts
│   │   ├── schema.ts
│   │   └── types.ts
│   ├── drivers/
│   ├── onboarding/
│   ├── billing/
│   └── admin/
├── lib/
│   ├── supabase/client.ts       — singleton
│   ├── auth/bootstrap.ts
│   ├── cache/queryClient.ts     — config + cacheKeys
│   ├── validation/              — schemas Zod
│   └── monitoring/
├── components/
│   ├── ui/                      — shadcn/ui
│   └── layout/                  — Shell, Sidebar, Header
└── types/
    ├── database.types.ts        — généré par supabase gen types
    └── domain/                  — types métier enrichis
```

---

## C. Migration progressive (sans casser prod)

### Semaine 1-2 : Backend
- [ ] Appliquer materialized views + refresh cron
- [ ] Appliquer cache table fleet_metrics_cache
- [ ] Créer RPC `get_user_bootstrap` + `get_fleet_dashboard_metrics`
- [ ] Ajouter indexes manquants (creneaux, clotures, incidents)
- [ ] Supprimer `select("*")` dans les repositories critiques

### Semaine 2-3 : Auth
- [ ] Implémenter `useBootstrap` (remplace 3-4 queries séquentielles)
- [ ] Implémenter `BootstrapProvider`
- [ ] Refactor `ProtectedRoute` sans boucle redirect
- [ ] Configurer `staleTime` sur toutes les queries auth

### Semaine 3-4 : Dashboard
- [ ] Lazy loading toutes les routes
- [ ] Micro-skeletons par widget (remplace skeleton global)
- [ ] `useFleetMetrics` depuis cache table
- [ ] `placeholderData` pour garder l'affichage pendant le refetch

### Semaine 4-5 : Cache & Optimistic
- [ ] Centraliser `cacheKeys` dans `queryClient.ts`
- [ ] Invalidations ciblées (pas `invalidateQueries()` global)
- [ ] Optimistic updates sur create vehicle/driver

### Semaine 5-6 : Bundle
- [ ] `manualChunks` Vite
- [ ] Bundle analysis → identifier > 50kb chunks parasites
- [ ] Preconnect Supabase dans `index.html`
- [ ] Cache-Control immutable assets Vercel

### Semaine 6-7 : Monitoring
- [ ] Sentry perf (LCP, TTFB, RPC timing)
- [ ] pg_stat_statements → slow query audit
- [ ] Edge Function health check
- [ ] Alertes Sentry sur LCP > 3s

### Semaine 8 : Hardening
- [ ] Zod sur toutes les mutations
- [ ] Rate limiting RPCs sensibles
- [ ] CI check RLS (toutes tables)
- [ ] Audit `supabase gen types` → zéro mismatch TypeScript

---

## D. Checklists production

### Performance
- [ ] LCP < 2.5s mesuré en prod (Sentry / Web Vitals)
- [ ] TTFB < 800ms (Vercel Analytics)
- [ ] Aucun `select("*")` en production
- [ ] staleTime configuré sur tous les useQuery
- [ ] Chunk principal < 200kb (gzip)
- [ ] Routes lazifiées (chaque page = chunk séparé)
- [ ] Materialized views refresh < 2s
- [ ] RPC bootstrap < 50ms

### Sécurité
- [ ] RLS activée sur toutes les tables public.*
- [ ] Aucun SECURITY DEFINER view (voir migration 20260521000001)
- [ ] Toutes RPCs avec `SET search_path = public`
- [ ] Zod validation sur toutes les mutations
- [ ] Rate limiting sur RPCs d'écriture
- [ ] Audit logs sur actions sensibles
- [ ] `select("*")` absent du code

### Déploiement Vercel
- [ ] `vercel.json` avec Cache-Control immutable sur /assets/**
- [ ] Variables d'environnement validées au démarrage
- [ ] Build produit < 500kb total gzip
- [ ] Compression Brotli activée

### Monitoring
- [ ] Sentry configuré avec `tracesSampleRate: 0.1`
- [ ] Mesure LCP/TTFB/RPC dans chaque page critique
- [ ] Health check endpoint opérationnel
- [ ] Alert sur erreur 500 Supabase RPC
- [ ] pg_stat_statements activé
- [ ] Dashboard slow queries audité hebdomadairement

### Schéma SQL
- [ ] `supabase gen types typescript` en CI → zéro erreur tsc
- [ ] Migrations idempotentes (`IF NOT EXISTS`, `CREATE OR REPLACE`)
- [ ] `09_validation_tests.sql` passe en vert après chaque déploiement
- [ ] Aucune colonne manquante détectée par l'audit

---

## E. Roadmap phases résumé

| Phase | Priorité | Durée | Impact LCP | Effort |
|---|---|---|---|---|
| 1 — Backend (MV + cache + indexes) | 🔴 Critique | S1-2 | -1.5s | Moyen |
| 2 — Auth (bootstrap RPC) | 🔴 Critique | S2-3 | -1s | Faible |
| 3 — Dashboard (lazy + skeletons) | 🟠 Haute | S3-4 | -0.5s | Moyen |
| 4 — Analytics scalable | 🟠 Haute | S4-5 | — | Élevé |
| 5 — Cache TanStack Query | 🟡 Moyenne | S5 | -0.3s | Faible |
| 6 — Bundle Vite | 🟡 Moyenne | S6 | -0.8s | Faible |
| 7 — Monitoring | 🟢 Recommandé | S7 | — | Faible |
| 8 — Hardening | 🟢 Recommandé | S8 | — | Moyen |

**Gain LCP estimé total : -4s** (de ~5s vers ~1s en prod Vercel + Supabase Europe)

---

> Note migration Next.js : les gains SSR (RSC, streaming) nécessitent une migration complète Vite→Next.js (effort ×3). Déconseillé avant que la stabilisation des phases 1-5 soit validée. À envisager en phase 2026 Q4 si LCP reste > 2s après les optimisations SPA.
