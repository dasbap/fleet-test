# Stratégie Baseline / Rebase Migrations

## Objectif
Stabiliser les déploiements Supabase sur des bases déjà vivantes, en évitant les conflits historiques (DROP destructifs, policies déjà présentes, objets renommés).

## Option simple (court terme)
1. Conserver l'historique actuel et corriger les migrations historiques pour les rendre idempotentes.
2. Continuer avec `supabase db push` classique.
3. Vérifier à chaque push :
   - `npx supabase migration list`
   - `npx supabase db lint --linked`

## Option scalable (recommandée)
1. Geler l'état de la base distante de référence.
2. Générer une baseline SQL (schéma + fonctions + policies) depuis la base distante.
3. Rejouer uniquement un lot réduit de deltas sécurité.
4. Archiver/documenter les migrations legacy non rejouées.
5. Valider en CI les scénarios "nouvel environnement" et "environnement existant".
6. Garder `supabase/schema.sql` comme baseline canonique unique.
7. Limiter `supabase/run-securite-rls-and-functions.sql` à la vérification (aucune création/modification d'objet).

## Implémentation dans ce dépôt

### 1) Freeze de la base distante

Commande :

```powershell
npm run freeze:remote-schema
```

Sortie :
- snapshots horodatés dans `supabase/snapshots/`
- `schema.sql`, `roles.sql`, `summary.txt`

### 2) Baseline de référence

- Baseline : `supabase/baseline/00000000000000_baseline_schema.sql`
- Deltas officiels : `supabase/baseline/delta-migrations.txt`

### 3) Validation locale baseline + deltas

Commande :

```powershell
npm run test:baseline-delta
```

Le script :
1. démarre Supabase local,
2. reset la DB locale,
3. applique baseline,
4. applique les deltas dans l'ordre.

### 4) Archive legacy

Référence documentaire :
- `supabase/archive/legacy-migrations/README.md`

### 5) Validation CI

Workflow :
- `.github/workflows/supabase-baseline-delta.yml`

Contrôles :
- exécution baseline + deltas sur DB locale vierge,
- vérification de l'existence des fichiers delta listés.
- exécution des tests SQL sécurité (RLS/RPC anti-régression).

### 6) Matrice d'accès canonique

- Source SQL : vue `public.v_access_matrix` (définie dans `schema.sql`).
- Export lisible équipe : `supabase/docs/access-matrix.md`.
- Règle : toute policy ajoutée/modifiée doit être reflétée dans la vue et l'export.

## Règles techniques
- Éviter `DROP FUNCTION` sur fonctions utilisées par des policies RLS ; préférer `CREATE OR REPLACE FUNCTION`.
- Rendre les migrations idempotentes (`DROP ... IF EXISTS`, `CREATE ... IF NOT EXISTS` quand possible).
- Pour les policies, faire un `DROP POLICY IF EXISTS` explicite avant `CREATE POLICY`.
- Pour les fonctions exposées via RLS/RPC : `SECURITY DEFINER` + `SET search_path = public`.

## Contrôles sécurité après déploiement
- Activer dans tableau de bord Supabase : Leaked password protection (HaveIBeenPwned).
- Relancer Security Advisor.
- Vérifier les fonctions sensibles (`affecter_vehicule`, `fermer_creneau`, alias legacy) avec `pg_get_functiondef`.
- Exécuter `supabase/run-securite-rls-and-functions.sql` pour auditer RLS/search_path/EXECUTE grants.
