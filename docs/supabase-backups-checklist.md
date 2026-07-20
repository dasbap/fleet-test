# Checklist backups Supabase — E-SAMBA prod

Projet : `zqxjvmejoktwlcqshnwi` (E-SAMBA Planificateur) | Région : `eu-west-1`  
Organisation : `viwjsaoiigwrwttmbpwl` (`aquitexport's Organistion`)

> Les backups ne sont pas exposés via l’API MCP. Les contrôles dashboard restent la source de vérité pour les dates exactes.

## Plan et facturation

| Élément | Valeur | Vérifié le |
|---------|--------|------------|
| Plan organisation | **Pro** | 2026-06-11 (MCP `get_organization`) |
| Statut projet prod | `ACTIVE_HEALTHY` | 2026-06-11 |
| PostgreSQL | 17.6 | 2026-06-11 |
| Taille DB (baseline) | **29 MB** / 8 Go inclus Pro | 2026-06-11 (SQL) |

## Contrôles obligatoires (prod B2B)

- [x] **Settings → Database → Backups** : backups quotidiens activés (plan Pro minimum)
- [x] **PITR** (Point-in-Time Recovery) : activé si RPO < 24 h requis
- [x] Noter la **rétention** : **7 jours** (backups quotidiens plan Pro ; PITR = fenêtre add-on selon contrat)
- [ ] Confirmer dans le dashboard la **date du dernier backup réussi** (non exposée via API)
- [x] Projet parasite `wdvpekljddxfdxpbyfgz` (`supabase --version`) : statut **INACTIVE** — suppression définitive à faire dans [Organization → Projects](https://supabase.com/dashboard/org/viwjsaoiigwrwttmbpwl)

## Test de restauration (trimestriel)

Prochaine échéance suggérée : **2026-09-11**

1. Créer une **branche** Supabase ou restaurer sur un projet de staging
2. Exécuter `supabase/scripts/verify/verify-team-adhesions.sql` sur la copie
3. Valider que les migrations locales = prod (`supabase migration list --linked`)

## En cas d’incident

1. Stopper les écritures applicatives (maintenance Vercel si nécessaire)
2. Dashboard → **Database → Backups** → Restore
3. Rejouer les migrations manquantes depuis [`supabase/migrations/`](../supabase/migrations/)
4. Vérifier RLS et Edge Functions après restauration

## Références dépôt

- [`docs/SUPABASE-SETUP.md`](SUPABASE-SETUP.md) — section sécurité
- [`docs/supabase-pro-validation.md`](supabase-pro-validation.md) — validation plan Pro complète
- [`docs/schema-remediation/08_cleanup_unused.sql`](../supabase/migrations/../schema-remediation/08_cleanup_unused.sql) — rappel backup avant cleanup

**Dernière revue documentaire** : 2026-06-11
