# Changelog PR-ready — SaaS multi-tenant (e-Samba)

Ce document résume les changements livrés pour le passage SaaS multi-tenant, leurs impacts sécurité, et la procédure de déploiement Supabase.

## Statut de fonctionnement (preuve par le code)

- `npm run lint` : OK
- `npm test` : OK (suite complète verte)
- Flux multi-tenant branché :
  - contexte tenant actif côté auth,
  - guards onboarding corrigés (`/start`),
  - billing minimal connecté aux données `abonnements` / `paiements`,
  - tests unitaires ajoutés sur accès tenant et billing.

## Résumé des changements

### Sécurité et isolation tenant

- Nouvelle migration de durcissement : `supabase/migrations/20260415183000_harden_multi_tenant_saas.sql`
- Suppression de l’accès `anon` aux RPC sensibles :
  - `creer_ou_mettre_a_jour_adhesion_flotte(...)`
  - `accepter_invitation(text)`
- Ajout de la contrainte d’unicité `onboarding_progress(org_id)` pour fiabiliser l’`upsert`.
- Activation RLS sur `paiements` + policies strictes manager/organizer au niveau organisation.

### Backend applicatif (Repository -> Service)

- Accès tenant :
  - `src/repositories/tenant-access.repository.ts`
  - `src/services/tenant-access.service.ts`
- Billing minimal :
  - `src/repositories/billing.repository.ts`
  - `src/services/billing.service.ts`
  - `src/hooks/useBilling.ts`

### Frontend multi-tenant

- Contexte tenant explicite :
  - `src/contexts/auth-context.ts`
  - `src/contexts/AuthProvider.tsx`
- Routing/guards onboarding :
  - `src/hooks/useRouteAccess.ts`
  - `src/components/auth/ProtectedRoute.tsx`
  - `src/components/auth/OnboardingRoute.tsx`
  - `src/components/auth/TenantBootstrapRoute.tsx`
  - `src/app/routes/app.routes.tsx`
- UI admin/billing minimale :
  - switcher de flotte dans `src/components/dashboard/DashboardHeader.tsx`
  - page finances connectée `src/pages/Finances.tsx`

### Tests

- `src/test/tenant-access.service.test.ts`
- `src/test/billing.service.test.ts`
- `src/components/auth/TenantBootstrapRoute.test.tsx`
- Ajustement test header : `src/components/dashboard/DashboardHeader.test.tsx`

## Impacts migration Supabase

### Impacts attendus

- **Sécurité renforcée** : suppression de surfaces d’appel anonymes sur RPC à privilèges.
- **Onboarding plus robuste** : un seul état d’onboarding par organisation.
- **Billing cloisonné** : accès aux paiements borné aux rôles gestionnaires de l’organisation.

### Risques

- Si des intégrations externes appelaient `accepter_invitation` en `anon`, elles doivent passer par un utilisateur authentifié.
- Si des doublons existaient déjà dans `onboarding_progress.org_id`, l’ajout d’unicité peut échouer (cas à vérifier avant prod).

## Checklist de déploiement Supabase

## 1) Pré-check (avant migration)

- [ ] Sauvegarde DB / snapshot disponible.
- [ ] Vérifier absence de doublons onboarding :

```sql
select org_id, count(*)
from public.onboarding_progress
group by org_id
having count(*) > 1;
```

- [ ] Vérifier utilisateurs/automations qui dépendraient d’un appel `anon` des RPC ciblées.

## 2) Application migration

- [ ] Appliquer `supabase/migrations/20260415183000_harden_multi_tenant_saas.sql`.
- [ ] Vérifier exécution sans erreur dans SQL editor / pipeline.

## 3) Post-check sécurité et intégrité

- [ ] Vérifier que `anon` n’a plus `EXECUTE` sur RPC sensibles.
- [ ] Vérifier présence de la contrainte unique :

```sql
select conname
from pg_constraint
where conname = 'onboarding_progress_org_id_key';
```

- [ ] Vérifier RLS active sur `paiements` :

```sql
select relname, relrowsecurity
from pg_class
where relname = 'paiements';
```

## 4) Validation applicative

- [ ] `npm run lint`
- [ ] `npm test`
- [ ] Parcours manuel :
  - signup sans tenant -> redirection `/start`,
  - création tenant -> accès dashboard,
  - switch flotte -> contexte actif mis à jour,
  - consultation finances -> données tenantisées.

## Rollback (si incident)

En cas d’incident prod, appliquer rollback contrôlé :

- [ ] Re-déployer l’application sur le commit stable précédent.
- [ ] Restaurer un backup DB si nécessaire (préféré si contrainte cassante).
- [ ] Si rollback SQL partiel indispensable, rétablir explicitement permissions/policies selon baseline validée équipe sécurité.

Note : éviter les rollbacks SQL ad hoc en production sans revue, car les permissions RLS/RPC sont sensibles.

## Points de monitoring recommandés (J+1)

- Taux d’erreurs d’accès RLS (403/permission denied)
- Échecs onboarding par organisation
- Temps de résolution du tenant actif (chargement auth)
- Échecs lecture billing par rôle

