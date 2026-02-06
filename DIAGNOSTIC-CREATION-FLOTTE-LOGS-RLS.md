# Diagnostic : création de flotte – logs Supabase et RLS

**Date** : 2025-02-06  
**Objectif** : Vérifier la création réelle des flottes et memberships, et les politiques RLS via les logs Supabase et des requêtes SQL de contrôle.

---

## 1. Logs Postgres (dernières 24 h)

### Erreur identifiée

- **Message** : `column flottes.country_code does not exist`
- **Fréquence** : Nombreuses occurrences (chaque chargement de la liste des flottes côté front).
- **Cause** : Le frontend interroge la table `flottes` avec `select=id,name,country_code`. Or la table `flottes` ne contient **pas** la colonne `country_code` ; celle-ci existe sur la table **`organisations`** (chaque flotte est liée à une organisation via `org_id`).

### Autres entrées

- Connexions normales (authenticator, postgres_exporter, supabase_admin).
- Checkpoints et activité habituelle.

---

## 2. Logs API (dernières 24 h)

### Requêtes en échec (400)

- **Path** : `GET /rest/v1/flottes?select=id,name,country_code&id=in.(...)`
- **Status** : 400 (Bad Request), cohérent avec l’erreur Postgres ci‑dessus.

### Requêtes en succès (200)

- **Path** : `GET /rest/v1/flotte_adhesions?select=id,fleet_id,role,is_active&user_id=eq.<uuid>&is_active=eq.true`
- **Conclusion** : La lecture des adhésions (`flotte_adhesions`) fonctionne ; les politiques RLS permettent bien à l’utilisateur de voir ses propres memberships.
- **RPC** : `POST /rest/v1/rpc/assurer_profil_utilisateur` → 200.

### Autres

- `GET /rest/v1/profils?select=full_name&user_id=eq.<uuid>` → 406 (Not Acceptable) dans certains cas, à traiter à part.

---

## 3. Structure des tables (requêtes SQL de contrôle)

### Colonnes réelles

| Table                | Colonnes pertinentes                                                                 |
|----------------------|---------------------------------------------------------------------------------------|
| `organisations`      | id, name, **country_code**, created_at                                                |
| `flottes`            | id, org_id, name, **collection_policy**, created_at (pas de country_code)            |
| `flotte_adhesions`   | id, fleet_id, user_id, role, is_active, created_at                                    |

La création de flotte (RPC `creer_flotte_esamba` / équivalent) crée bien une organisation et une flotte ; le `country_code` est porté par l’organisation.

### Données existantes (comptages)

| Table               | Nombre de lignes |
|---------------------|------------------|
| organisations       | 8                |
| flottes             | 9                |
| flotte_adhesions    | 14               |

Un échantillon de jointure `flottes` ↔ `organisations` montre des flottes correctement liées à une organisation avec `country_code` (ex. `CM`).

---

## 4. Politiques RLS

### `flotte_adhesions`

| Politique                         | Commande | Condition (SELECT)                                                                 |
|-----------------------------------|----------|-------------------------------------------------------------------------------------|
| memberships_select_self_or_manager_org | SELECT   | `user_id = auth.uid()` OU `has_role(fleet_id, 'manager')` OU `has_role(fleet_id, 'organizer')` |
| memberships_insert_authenticated  | INSERT   | Authentifié                                                                        |
| memberships_update_authenticated  | UPDATE   | Authentifié                                                                        |
| memberships_delete_authenticated  | DELETE   | Authentifié                                                                        |

**Conclusion** : Un utilisateur peut lire ses propres lignes d’adhésion ; les RPC qui insèrent une ligne avec `user_id = auth.uid()` après création de flotte sont donc lisibles par cet utilisateur.

### `flottes`

- **fleets_read_authenticated** (SELECT) : `true` pour tout authentifié.
- INSERT / UPDATE / DELETE : politiques présentes pour authentifié.

### `organisations`

- **orgs_read_authenticated** (SELECT) : `true` pour tout authentifié.
- INSERT / UPDATE / DELETE : politiques présentes pour authentifié.

Les politiques RLS ne bloquent pas la création ni la lecture des flottes et adhésions pour un utilisateur authentifié.

---

## 5. Synthèse

| Point                          | Statut |
|--------------------------------|--------|
| Création réelle des flottes / orgs / adhésions | OK (données présentes, RPC utilisées) |
| Lecture des memberships (`flotte_adhesions`)   | OK (200, RLS adaptées)                |
| Lecture des flottes avec `country_code`       | KO (400) : colonne demandée sur `flottes` alors qu’elle est sur `organisations` |

**Cause racine** : Le hook frontend `useUserFleets` (ou équivalent) fait un `select("id, name, country_code")` sur la table `flottes`. Il faut soit ne plus demander `country_code` sur `flottes`, soit l’obtenir via une jointure avec `organisations` (voir correctif ci‑dessous).

---

## 6. Correctif recommandé (frontend)

- **Fichier** : `src/hooks/useUserFleets.ts`
- **Changement** : Ne plus sélectionner `country_code` sur `flottes`. Récupérer le pays via la relation `flottes.org_id → organisations` (jointure Supabase), par exemple :
  - `supabase.from("flottes").select("id, name, organisations(country_code)").in("id", fleetIds)`
- Adapter le typage et le mapping pour exposer `country_code` sur l’objet flotte à partir de `organisations.country_code` (ex. `fleet.organisations?.country_code` → `fleet.country_code`).

Une fois ce correctif appliqué, les requêtes GET `/rest/v1/flottes` ne demanderont plus une colonne inexistante et les 400 disparaîtront.

---

## 7. Vérification post‑déploiement (non-régression)

- Après déploiement, vérifier qu’un utilisateur test peut :
  1. Créer une flotte (organisation + flotte + adhésion).
  2. Voir ses adhésions : `SELECT * FROM flotte_adhesions WHERE user_id = auth.uid() AND is_active = true`.
  3. Charger la liste des flottes (sans erreur 400) avec le pays affiché si besoin via la jointure organisations.

Un mini-script SQL optionnel pour vérifier les adhésions (à exécuter en tant qu’utilisateur concerné ou avec un rôle admin) :

```sql
SELECT fa.id, fa.fleet_id, fa.role, fa.is_active, f.name AS fleet_name
FROM flotte_adhesions fa
JOIN flottes f ON f.id = fa.fleet_id
WHERE fa.user_id = auth.uid();
```
