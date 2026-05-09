# Archive des migrations legacy (documentation)

Ce dossier documente les migrations legacy à ne plus utiliser pour le flux baseline/rebase.

## Objectif

- Garder la traçabilité historique.
- Éviter de rejouer des migrations destructives sur des bases déjà vivantes.

## Migrations legacy sensibles

- `supabase/migrations/20241202000000_migrate_to_french.sql`
- `supabase/migrations/20250206000000_fix_rpc_table_names.sql`
- `supabase/migrations/20250206000001_rename_rpc_functions_to_french.sql`
- `supabase/migrations/20250206000002_vehicle_active_status_rule.sql`
- `supabase/migrations/20250206000003_invitations_rls_and_accepter_invitation.sql`
- `supabase/migrations/20250206000004_fix_flotte_adhesions_rls_recursion.sql`
- `supabase/migrations/20250206000005_flotte_adhesions_fk_to_profils.sql`
- `supabase/migrations/20250206000006_add_verifier_sante_systeme_and_reparer_adhesion_orpheline.sql`
- `supabase/migrations/20250206000007_restrict_flotte_adhesions_update_delete_rls.sql`
- `supabase/migrations/20250206000008_add_maintenance_notes_planned_parts.sql`

## Chaîne recommandée à la place

- Baseline: `supabase/baseline/00000000000000_baseline_schema.sql`
- Deltas: `supabase/baseline/delta-migrations.txt`
