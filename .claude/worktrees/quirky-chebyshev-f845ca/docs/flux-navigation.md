# Flux de navigation et données - Smart Fleet Africa

Ce document décrit les flux entre les pages et modules du site (routes, navigation, auth, flotte, invitations, équipes). Pour l’architecture des couches (Repository, Service, Hook), voir [ARCHITECTURE.md](../ARCHITECTURE.md).

## 1. Routes et menu par rôle

### Arborescence des routes (`src/App.tsx`)

- **Publiques** : `/` (Index), `/auth` (Auth), `*` (NotFound).
- **Protégées** : toutes les routes sous `/dashboard` sont protégées par `ProtectedRoute` (non connecté → redirection vers `/auth`).

Routes dashboard : `/dashboard` (index), `vehicles`, `drivers`, `closure`, `incidents`, `maintenance`, `reports`, `invitations`, `settings`, `profile`, `teams`, `create-fleet`, `finances`, `collections`, `alerts`, `roles`, `my-vehicle`, `history`.

### Carte « SessionProvider / useSession » → implémentation réelle

Snippets ou tutoriels externes décrivent souvent un *provider* global, une route du type `<ProtectedRoute><Page /></ProtectedRoute>` et un hook `useSession().currentFleet`. Voici l’équivalence dans ce dépôt :

| Idée / pattern courant | Où c’est dans le code |
|------------------------|------------------------|
| `<SessionProvider><App /></SessionProvider>` dans [`main.tsx`](../src/main.tsx) | Aucun provider de session au point d’entrée : `main.tsx` enveloppe seulement `<App />` dans `Suspense`. Le contexte applicatif **session + adhésions flotte** est [`AuthProvider`](../src/contexts/AuthProvider.tsx), monté via [`AuthProviderLayout`](../src/components/auth/AuthProviderLayout.tsx) sur la branche de routes concernée dans [`app.routes.tsx`](../src/app/routes/app.routes.tsx), pour ne pas initialiser l’auth sur les pages publiques. |
| Route `/dashboard` protégée | Arbre **imbriqué** : [`dashboard.routes.tsx`](../src/app/routes/dashboard.routes.tsx) définit `<Route path="/dashboard" element={<ProtectedRoute />}>` puis les écrans en enfants. [`ProtectedRoute`](../src/components/layout/ProtectedRoute.tsx) applique les gardes (auth, bootstrap tenant, onboarding, upgrade, rôles optionnels) et rend `<Outlet />`, pas un composant page passé en enfant direct. |
| `useSession().currentFleet` (`fleet_id`, `role`, `plan_code`, `enables_reports`, …) | Le hook à utiliser est **`useAuth()`** (voir [`auth-context.ts`](../src/contexts/auth-context.ts)) : `userFleetId`, `activeTenantContext` (`fleetId`, `orgId`, `role`). Les champs type **plan / fonctionnalités facturées** ne sont pas sur ce contexte : les pages et gardes s’appuient sur d’autres hooks (ex. [`useFleetBillingContext`](../src/hooks/useFleetBillingContext.ts), [`useRouteAccess`](../src/hooks/useRouteAccess.ts)). |

Pour le détail du post‑login et des redirections, voir aussi [auth-flow.md](./auth-flow.md).

### Menu sidebar (`DashboardSidebar.tsx`)

- **Organizer** : Tableau de bord, Véhicules, Incidents, Maintenance, Équipes, Invitations, Rapports, Finances, Alertes, Rôles.
- **Manager** : Idem + Chauffeurs, Encaissements (pas Rôles).
- **Driver** : Mon tableau, Mon véhicule, Clôture, Signaler.
- **Mechanic** : Interventions (Maintenance), Incidents, Véhicules, Historique.

Les pages **Invitations** et **Équipes** sont réservées aux rôles organizer et manager ; les autres rôles sont redirigés vers `/dashboard`.

---

## 2. Flux Auth → Flotte → Rôle

Le `userFleetId` et le `role` de l’utilisateur viennent uniquement du hook `useAuth`, qui s’appuie sur :

- **FleetMemberService.getActiveMembershipsForUser(userId)** pour charger les adhésions actives.
- **useAcceptInvitation** (processPendingInvitation) à la connexion : si l’utilisateur a une invitation en attente dans ses métadonnées (inscription avec code), l’invitation est acceptée et un membership est créé.

Séquence typique :

1. Inscription sur `/auth` avec code d’invitation optionnel → `signUp(..., invitationFleetId, invitationCode)` ; les métadonnées utilisateur contiennent `invitation_fleet_id` et `invitation_code`.
2. Après vérification email, connexion → `onAuthStateChange` / `getSession` dans `useAuth`.
3. `useAuth` appelle `processPendingInvitation` (checkPendingInvitation + acceptInvitation) pour créer le membership si un code était en attente.
4. `useAuth` charge les memberships via `FleetMemberService.getActiveMembershipsForUser(userId)`.
5. `role` = rôle le plus élevé parmi les memberships ; `userFleetId` = `memberships[0].fleet_id` (premier membership actif).

Toutes les pages dashboard utilisent `useAuth()` pour `role`, `userFleetId` ou les deux.

---

## 3. Flux « Sans flotte »

Comportement aligné entre Dashboard, Invitations et Équipes :

- **Dashboard** : si `!userFleetId && role === null` → redirection vers `/dashboard/create-fleet`.
- **CreateFleet** : création de la flotte (et du membership organisateur) → `refreshMemberships()` → redirection vers `/dashboard`.
- **Invitations** : si `!userFleetId && role === null` → redirection vers `/dashboard/create-fleet`. Si `!userFleetId` mais `role` défini → affichage d’une carte « Aucune flotte » avec boutons « Tableau de bord » et « Créer une flotte ».
- **Équipes** : même logique que Invitations (redirection ou carte « Aucune flotte » avec « Tableau de bord » et « Créer une flotte »).

---

## 4. Lien métier Invitations ↔ Équipes

- **Invitations** : création et suppression de **codes** d’invitation (InvitationService / useInvitations, useDeleteInvitation). Les liens « Voir l’équipe » pointent vers `/dashboard/teams`.
- **Équipes** : liste et gestion des **membres** de la flotte (FleetMemberService, useFleetMembers, useAddFleetMember, etc.). Les liens « Créer une invitation » pointent vers `/dashboard/invitations`.

Flux métier : un utilisateur rejoint la flotte en utilisant un **code** lors de l’inscription (Auth) ; après acceptation de l’invitation (automatique à la connexion), il apparaît dans **Équipes**. Les deux pages proposent des liens croisés pour passer de l’une à l’autre.
