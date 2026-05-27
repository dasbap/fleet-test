# Semaine 1 - Fondation data et sécurité RLS

## Objectif

Importer les tables/policies critiques et prouver l'absence de fuite inter-tenant.

## Livrables attendus

- [ ] Inventaire des migrations SQL critiques reprises depuis `smart-fleet-africa`.
- [ ] Plan de chargement staging (ordre migrations, vérifications post-migration).
- [ ] Exécution des tests SQL de sécurité (`01`, `02`, `06`).
- [ ] Rapport de couverture policies sur tables critiques.

## Vérifications techniques

- [ ] `organisations`, `flottes`, `flotte_adhesions`, `vehicules`, `abonnements`, `droits_vehicules`, `jetons_qr` présentes.
- [ ] Helpers RLS requis disponibles (`has_role`, `can_manage_fleet`, etc.).
- [ ] Politique insertion organisations durcie (pas de `WITH CHECK (true)` sans garde).

## Commandes de contrôle (staging)

```bash
# Exemples à adapter au pipeline SQL de l'équipe
psql "$SUPABASE_DB_URL" -f supabase/tests/01_security_invariants.sql
psql "$SUPABASE_DB_URL" -f supabase/tests/02_policy_coverage.sql
psql "$SUPABASE_DB_URL" -f supabase/tests/06_option_c_rls_allow_deny.sql
```

## Go

- [ ] Tous les tests SQL de sécurité sont verts.
- [ ] Aucune table critique sans policy.

## No-Go (bloquant)

- [ ] Une policy permet une lecture ou écriture cross-tenant.
