# Vérification création de flotte – non-régression

Ce document décrit comment vérifier, après un déploiement ou une migration, que la **création de flotte** fonctionne correctement et qu’un utilisateur test peut créer une flotte et voir son adhésion dans `flotte_adhesions`.

---

## 1. Prérequis (rappel)

La création de flotte dépend de :

- **RPC en français**  
  - `creer_flotte_esamba(p_org_id, p_name, p_collection_policy)`  
  - `creer_ou_mettre_a_jour_adhesion_flotte(p_fleet_id, p_user_id, p_role, p_is_active)`
- **Politiques RLS sur `flotte_adhesions`**  
  Une politique SELECT qui évite la récursion infinie (ex. utilisation de `has_role()` en SECURITY DEFINER), pour que l’utilisateur puisse lire sa propre ligne après création.

Migrations à appliquer si besoin :

- `supabase/migrations/20250206000001_rename_rpc_functions_to_french.sql`
- `supabase/migrations/20250206000004_fix_flotte_adhesions_rls_recursion.sql`

---

## 2. Procédure manuelle (recommandée après déploiement)

1. Démarrer le front (`npm run dev`) et ouvrir l’application (ex. `http://localhost:8080`).
2. Se connecter avec un **utilisateur test**.
3. Aller sur **Créer une flotte** : `/dashboard/create-fleet`.
4. Saisir un nom d’organisation et un nom de flotte (uniques), puis valider.
5. Vérifier :
   - un **toast de succès** ;
   - une **redirection vers `/dashboard`** ;
   - la **présence de la flotte** dans l’app (ex. Paramètres > Mon espace organisateur, ou Profil > Mes flottes).
6. (Optionnel) Dans Supabase **SQL Editor**, exécuter la requête suivante en remplaçant `VOTRE_USER_ID` par l’UUID de l’utilisateur test :

   ```sql
   SELECT id, fleet_id, user_id, role, is_active, created_at
   FROM flotte_adhesions
   WHERE user_id = 'VOTRE_USER_ID'
   ORDER BY created_at DESC
   LIMIT 5;
   ```

   Au moins une ligne doit correspondre à la flotte venant d’être créée, avec `role = 'organizer'` et `is_active = true`.

---

## 3. Script SQL de vérification (non-régression)

Le script **`supabase/verify-creation-flotte-non-regression.sql`** permet de vérifier :

- que les fonctions RPC `creer_flotte_esamba` et `creer_ou_mettre_a_jour_adhesion_flotte` existent ;
- que les politiques RLS sur `flotte_adhesions` sont présentes (SELECT pour l’utilisateur ou manager/organizer).

**Utilisation** : dans le **Supabase SQL Editor**, ouvrir et exécuter le fichier `supabase/verify-creation-flotte-non-regression.sql`. Aucune authentification utilisateur n’est requise pour ces vérifications (existence des objets).

Ce script ne crée pas de données ; il ne fait que contrôler que l’environnement est correct. Le test fonctionnel complet reste la **procédure manuelle** ci-dessus (création via l’UI puis vérification du membership).

---

## 4. En cas d’échec

- **« Function does not exist »** : réappliquer la migration `20250206000001_rename_rpc_functions_to_french.sql`.
- **Récursion infinie sur `flotte_adhesions`** : réappliquer `20250206000004_fix_flotte_adhesions_rls_recursion.sql`.
- **Flotte créée mais invisible après redirection** : vérifier que l’utilisateur peut bien lire ses lignes dans `flotte_adhesions` (politique SELECT) et que le front recharge bien les memberships (ex. `refreshMemberships` dans `useAuth`).

Pour plus de détails sur le flux complet, voir le plan de debug (ex. `ANALYSE-FLUX-CREATION-FLOTTE.md` ou le plan « réparer définitivement la création de flotte »).
