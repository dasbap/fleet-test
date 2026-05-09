# Préconisations — droits réels : `flotte_adhesions` et RLS (Supabase)

## Principe

Les **droits réels** sur les données ne sont pas définis par le menu React : ils reposent sur :

1. **`flotte_adhesions`** — qui est membre de quelle flotte, avec quel **rôle** (`organizer`, `manager`, `driver`, `mechanic`), et si l’adhésion est **active**.
2. **Les politiques RLS** (Row Level Security) sur les tables du schéma `public` — quelles lignes un utilisateur authentifié peut **lire / insérer / mettre à jour / supprimer** selon son identité et son appartenance aux flottes / organisations.

L’interface ([`DashboardSidebar`](../src/components/dashboard/DashboardSidebar.tsx)) **filtre la navigation** par rôle applicatif ; **Supabase applique les politiques** sur chaque requête. Les deux doivent rester **alignés** avec la même intention métier.

## Préconisations

### Modèle de données et adhésions

- **Une seule source de vérité** pour « qui fait quoi dans quelle flotte » : la table **`flotte_adhesions`** (et les règles métier qui la maintiennent, ex. RPC `creer_ou_mettre_a_jour_adhesion_flotte`).
- Lors de l’ajout d’une fonctionnalité « par flotte », prévoir systématiquement :
  - comment l’utilisateur est **rattaché** à la flotte (adhésion existante ou création contrôlée) ;
  - comment les **lectures/écritures** sont **restreintes** aux flottes autorisées.

### RLS et politiques

- **RLS activée** sur les tables exposées à l’API avec la clé **anon** / utilisateur **authenticated** ; pas d’accès large « tout public » sur des données métier.
- Les politiques doivent refléter la **réalité métier** (ex. lecture limitée aux flottes dont l’utilisateur est membre, écriture selon rôle).
- Lors d’une nouvelle table ou d’une nouvelle opération : **écrire les politiques en même temps** que le schéma (pas en afterthought).
- Éviter les politiques **trop permissives** en production (ex. tout `authenticated` peut tout faire) ; les scripts historiques de démo documentés comme tels dans `supabase/archive/`.

### Fonctions RPC et triggers

- Fonctions utilisées par le client ou par les politiques : **`SECURITY DEFINER`** uniquement si nécessaire, avec **`SET search_path = public`** (ou schéma explicite) pour limiter les abus (voir migrations de durcissement du projet).
- Ne pas exposer de RPC qui contourne la RLS **sans** contrôle métier explicite (validation d’entrées, journalisation si actions sensibles).

### Cohérence UI ↔ backend

- Le hook [`useAuth`](../src/hooks/useAuth.ts) déduit un **rôle d’affichage** à partir des adhésions (hiérarchie `organizer` → `manager` → `mechanic` → `driver`). Toute évolution de cette règle doit être **documentée** et testée (comportement multi-flottes / multi-rôles).
- **`userFleetId`** (V1 : premier membership retourné) peut ne pas représenter « toutes » les flottes d’un utilisateur : le produit doit le **clarifier** (sélecteur de flotte, filtres) si plusieurs flottes sont courantes.

### Tests et validation

- Après changement de RLS : exécuter les **tests SQL** du dépôt (dossier `supabase/tests/` si présent) et les scénarios documentés (`npm run test:sql-security` selon [package.json](../package.json)).
- Vérifier le **Security Advisor** Supabase après déploiement.
- En démo : rappeler que **`verify:connection`** avec la clé **anon** sans session utilisateur peut montrer **0 ligne** sur certaines tables — c’est attendu si la RLS interdit la lecture anonyme.

### Exploitation et gouvernance

- **Staging / production** : activer les protections Auth recommandées par Supabase (ex. mots de passe compromis), voir [supabase/SECURITE.md](../supabase/SECURITE.md).
- Maintenir une **matrice d’accès** (vue ou export) à jour lorsque des policies changent — voir stratégie décrite dans [supabase/BASELINE-REBASE-STRATEGY.md](../supabase/BASELINE-REBASE-STRATEGY.md) (section matrice d’accès si applicable).

## Résumé une phrase

**L’adhésion flotte pose le « qui » ; la RLS pose le « quelles lignes » ; le frontend ne fait que refléter le rôle — ne jamais confondre visibilité UI et autorisation réelle.**
