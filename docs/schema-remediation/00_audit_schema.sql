-- ============================================================
-- 00_audit_schema.sql — E-Samba
-- Lecture seule. Exécuter dans Supabase SQL Editor avant toute correction.
-- Copier les résultats pour détecter le drift.
-- ============================================================

-- ── 1. Colonnes manquantes vs schéma canonique ───────────────────────────────

SELECT 'flotte_adhesions' AS table_name, 'statut' AS colonne_manquante
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'flotte_adhesions' AND column_name = 'statut'
)
UNION ALL
SELECT 'flotte_adhesions', 'rejoint_le'
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'flotte_adhesions' AND column_name = 'rejoint_le'
)
UNION ALL
SELECT 'flotte_adhesions', 'updated_at'
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'flotte_adhesions' AND column_name = 'updated_at'
)
UNION ALL
SELECT 'profils', 'email'
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'profils' AND column_name = 'email'
)
UNION ALL
SELECT 'profils', 'role'
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'profils' AND column_name = 'role'
)
UNION ALL
SELECT 'scores_conducteurs', 'score_total'
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'scores_conducteurs' AND column_name = 'score_total'
);

-- ── 2. Colonnes legacy à supprimer ───────────────────────────────────────────

SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'onboarding_progress' AND column_name = 'data')
    OR (table_name = 'profils' AND column_name = 'access_universe')
    OR (table_name = 'profils' AND column_name = 'clerk_user_id')
    OR (table_name = 'profils' AND column_name = 'id')
  )
ORDER BY table_name, column_name;

-- ── 3. RPC manquantes ─────────────────────────────────────────────────────────

SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'sauvegarder_progression_onboarding',
    'finaliser_onboarding',
    'user_can_manage_org_onboarding',
    'calculer_score_conducteur_v2',
    'fleet_activation_metrics',
    'affecter_vehicule',
    'get_top_driver_scores',
    'has_role',
    'get_fleet_billing_context',
    'creer_vehicule_esamba',
    'is_platform_admin'
  )
ORDER BY routine_name;

-- ── 4. Vues SECURITY DEFINER ──────────────────────────────────────────────────

SELECT viewname AS vue, 'SECURITY DEFINER' AS probleme
FROM pg_views
WHERE schemaname = 'public'
  AND definition ILIKE '%security_definer%';

-- ── 5. Policies RLS sur onboarding_progress ──────────────────────────────────

SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'onboarding_progress';

-- ── 6. Triggers existants ──────────────────────────────────────────────────────

SELECT trigger_name, event_object_table, event_manipulation, action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ── 7. Profils sans auth.users (orphelins) ────────────────────────────────────

SELECT p.user_id, p.email, p.created_at
FROM public.profils p
LEFT JOIN auth.users u ON u.id = p.user_id
WHERE u.id IS NULL
LIMIT 50;

-- ── 8. auth.users sans profil ─────────────────────────────────────────────────

SELECT u.id, u.email, u.created_at
FROM auth.users u
LEFT JOIN public.profils p ON p.user_id = u.id
WHERE p.user_id IS NULL
LIMIT 50;

-- ── 9. Comptes démo actifs > 30 jours ────────────────────────────────────────

SELECT user_id, email, expires_at, status
FROM public.profils
WHERE universe = 'temporary'
  AND (expires_at IS NULL OR expires_at < now())
  AND status = 'active'
LIMIT 50;

-- ── 10. access_codes expirés mais actifs ──────────────────────────────────────

SELECT id, code, universe, expires_at, used_count, max_uses
FROM public.access_codes
WHERE is_active = true
  AND (expires_at < now() OR used_count >= max_uses)
LIMIT 50;

-- ── 11. Contraintes UNIQUE manquantes ────────────────────────────────────────

SELECT 'flotte_adhesions (user_id, fleet_id)' AS contrainte_manquante
WHERE NOT EXISTS (
  SELECT 1 FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public' AND t.relname = 'flotte_adhesions'
    AND c.contype = 'u'
    AND array_length(c.conkey, 1) = 2
)
UNION ALL
SELECT 'onboarding_progress (org_id)'
WHERE NOT EXISTS (
  SELECT 1 FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public' AND t.relname = 'onboarding_progress'
    AND c.contype IN ('u', 'p')
    AND exists (
      SELECT 1 FROM pg_attribute a
      WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey) AND a.attname = 'org_id'
    )
);

-- ── 12. Tables sans RLS activée ───────────────────────────────────────────────

SELECT c.relname AS table_sans_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND NOT c.relrowsecurity
  AND c.relname NOT LIKE 'pg_%'
ORDER BY c.relname;

-- ── 13. Résumé état onboarding_progress ──────────────────────────────────────

SELECT
  COUNT(*) AS total_rows,
  COUNT(*) FILTER (WHERE completed = true) AS completed,
  COUNT(*) FILTER (WHERE completed = false) AS en_cours,
  COUNT(*) FILTER (WHERE data IS NOT NULL AND data != '{}') AS rows_avec_col_legacy_data,
  COUNT(*) FILTER (WHERE steps_data IS NOT NULL AND steps_data != '{}') AS rows_avec_steps_data
FROM public.onboarding_progress;
