# Analyse du flux de création de flotte – Pourquoi la flotte créée n’apparaît pas

## Contexte

Après création d’une flotte via `/dashboard/create-fleet`, l’utilisateur est redirigé vers `/dashboard` mais la flotte n’apparaît pas : le Dashboard le renvoie vers la page de création de flotte, ou les vues (Dashboard, Settings, Teams) n’affichent pas la nouvelle flotte.

## 1. Flux côté CreateFleet

**Fichier :** `src/pages/CreateFleet.tsx`

- **Séquence :**
  1. Création organisation (insert direct ou réutilisation si même nom).
  2. Appel RPC `creer_flotte_esamba(p_org_id, p_name, p_collection_policy)` → retourne un `uuid` (id de la flotte).
  3. Appel RPC `creer_ou_mettre_a_jour_adhesion_flotte(p_fleet_id, p_user_id, p_role: "organizer", p_is_active: true)` → crée l’adhésion pour l’utilisateur courant.
  4. En `onSuccess` :
     - Toast de succès.
     - `queryClient.invalidateQueries({ queryKey: ["fleet-members"] })` et `["user-fleet"]`.
     - **`await refreshMemberships()`** (hook useAuth).
     - **`navigate("/dashboard")`**.

- **Point important :** Les clés React Query invalidées (`fleet-members`, `user-fleet`) sont utilisées par `useFleetMembers` et d’autres hooks, mais **les memberships affichés par le Dashboard viennent de `useAuth()`**, qui repose sur un **état local React** (`useState`), pas sur React Query. L’invalidation ne met donc pas à jour `memberships` / `userFleetId` dans useAuth.

- La mise à jour réelle vient uniquement de **`refreshMemberships()`**, qui appelle `fetchMemberships(user.id)` puis `setMemberships(data)`.

## 2. useAuth et userFleetId

**Fichier :** `src/hooks/useAuth.ts`

- **État :** `memberships` (liste d’adhésions actives) et `userFleetId = memberships[0]?.fleet_id ?? null`.
- **Chargement initial :** dans un `useEffect` au montage :
  - Abonnement **`onAuthStateChange`** : à chaque changement de session, mise à jour `session`/`user`, puis si `session?.user` → **`fetchMemberships(session.user.id)` sans `await`**, puis **`setIsLoading(false)`**.
  - **`getSession().then(...)`** : même session/user, puis **`await fetchMemberships(session.user.id)`**, puis **`setIsLoading(false)`**.

**Cause racine identifiée :** Dans **`onAuthStateChange`**, `fetchMemberships` n’est **pas** attendu avant `setIsLoading(false)`. Donc :

1. L’utilisateur quitte CreateFleet et arrive sur Dashboard.
2. Dashboard monte et appelle `useAuth()` (nouvelle instance du hook, nouvel état).
3. Le `useEffect` de useAuth s’exécute : subscription + `getSession()`.
4. Si **`onAuthStateChange`** est déclenché (ex. `INITIAL_SESSION`) **avant** ou **en parallèle** de la résolution de `getSession()` :
   - On met à jour `user`, on lance `fetchMemberships(user.id)` **sans attendre**.
   - On appelle tout de suite **`setIsLoading(false)`**.
5. Au rendu suivant : `isLoading === false`, `memberships` encore vide (la requête n’a pas fini), donc **`userFleetId === null`**.
6. Dans **Dashboard**, l’effet `if (!isLoading && !userFleetId && role === null) navigate("/dashboard/create-fleet")` s’exécute → **redirection vers la page de création de flotte**. La flotte vient d’être créée mais n’a jamais été “vue” par le Dashboard car les memberships n’étaient pas encore chargés.

En résumé : **une condition de concurrence** entre `onAuthStateChange` et `getSession()` fait que `isLoading` passe à `false` avant la fin de `fetchMemberships`, ce qui déclenche la redirection “pas de flotte” alors que la flotte existe déjà.

## 3. useUserFleets

**Fichier :** `src/hooks/useUserFleets.ts`

- Prend en entrée **`memberships`** (provenant de useAuth).
- Charge les flottes via `flottes.id IN (memberships[].fleet_id)`.
- Si `memberships` est vide (à cause du problème ci‑dessus), la liste des flottes reste vide. Aucun bug supplémentaire dans ce hook.

## 4. Pages Dashboard, Settings, Teams

- **Dashboard** (`src/pages/Dashboard.tsx`)  
  - Utilise `userFleetId` et `role` de useAuth.  
  - Redirection vers `/dashboard/create-fleet` si `!isLoading && !userFleetId && role === null`.  
  - C’est cette condition qui renvoie à la création de flotte alors que les memberships ne sont pas encore chargés.

- **Settings** (`src/pages/Settings.tsx`)  
  - Utilise `userFleetId` pour `useFleetMembers(userFleetId)` et pour afficher “Créez une flotte” si `!userFleetId`.  
  - Si `userFleetId` est encore null (même race), la flotte ne s’affiche pas.

- **Teams** (`src/pages/Teams.tsx`)  
  - Même dépendance à `userFleetId` (liste des membres, ajout de membre).  
  - Redirection vers create-fleet si `!userFleetId && role === null`.  
  - Même symptôme si memberships pas encore chargés.

Toutes ces pages dépendent d’un **`userFleetId` et d’un `role` cohérents**, eux‑mêmes dérivés de **`memberships`** dans useAuth. Dès que `isLoading` passe à `false` avant que `memberships` soit rempli, les écrans se comportent comme “aucune flotte”.

## 5. Backend (RPC et RLS)

- **RPC :**  
  - `creer_flotte_esamba` retourne bien un `uuid`.  
  - `creer_ou_mettre_a_jour_adhesion_flotte` insère/met à jour une ligne dans `flotte_adhesions` avec le `user_id` courant.

- **RLS sur `flotte_adhesions`** (migration `20250206000004_fix_flotte_adhesions_rls_recursion.sql`) :  
  - Politique SELECT : `user_id = auth.uid()` OU manager/organizer de la flotte.  
  - L’utilisateur peut donc lire sa propre ligne d’adhésion après l’insertion par la RPC. Aucun blocage RLS côté lecture identifié.

## 6. Conclusion et correctif

- **Cause principale :** Dans `useAuth`, le handler **`onAuthStateChange`** ne fait **pas** `await fetchMemberships(...)` avant d’appeler **`setIsLoading(false)`**, ce qui peut rendre `isLoading` faux alors que `memberships` est encore vide et déclencher la redirection “créer une flotte” alors qu’une flotte vient d’être créée.
- **Correctif appliqué :** Attendre la fin de `fetchMemberships` dans le handler `onAuthStateChange` (quand `session?.user` est défini) avant d’appeler `setIsLoading(false)`, de la même manière que dans le callback `getSession().then(...)`. Ainsi, les pages (Dashboard, Settings, Teams) ne considèrent l’utilisateur “chargé” qu’une fois les memberships effectivement récupérés, et la flotte créée apparaît correctement.

## 7. Vérifications optionnelles post‑correctif

- Tester le scénario : création de flotte → redirection → vérifier que le Dashboard affiche bien la flotte (stats, FleetOverview, pas de redirection vers create-fleet).
- Tester avec un utilisateur ayant déjà une flotte : connexion → Dashboard sans redirection intempestive.
- Vérifier Settings et Teams après création : liste des membres et flotte courante cohérentes.
