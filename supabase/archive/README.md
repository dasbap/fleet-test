# Scripts SQL archivés

Ces scripts ont été remplacés par les migrations officielles et ne doivent **pas** être exécutés en production.

- **fix-all-issues-complete.sql** — RLS et politiques « always true » : remplacé par les migrations `20250223100000_enable_rls_all_tables.sql` et `20250223110000_fix_rls_policies_restrictive.sql`.
- **fix-orgs-rls-policies.sql** — Politiques RLS orgs/fleets (noms anglais) : remplacé par les migrations 20250223\*.
- **fix-all-rls-policies.sql** — Idem, référençait des tables `orgs`/`fleets` renommées en `organisations`/`flottes`.
- **fix-fleet-memberships-rls-policies.sql** — Politiques permissives sur les adhésions : remplacé par les politiques restrictives dans `20250223110000_fix_rls_policies_restrictive.sql`.
- **fix-memberships-read-policy.sql** — Lecture adhésions : consolidé dans la migration des politiques restrictives.

La source de vérité pour la RLS et les politiques est désormais le dossier `supabase/migrations/`.
