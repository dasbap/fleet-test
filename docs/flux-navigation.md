# Flux de navigation et données - Smart Fleet Africa

Ce document décrit les flux entre les pages et modules du site (routes, navigation, auth, flotte, invitations, équipes). Pour l’architecture des couches (Repository, Service, Hook), voir [ARCHITECTURE.md](../ARCHITECTURE.md).

## 1. Routes et menu par rôle

### Arborescence des routes (`src/App.tsx`)

- **Publiques** : `/` (Index), `/auth` (Auth), `*` (NotFound).
- **Protégées** : toutes les routes sous `/dashboard` sont protégées par `ProtectedRoute` (non connecté → redirection vers `/auth`).

Routes dashboard : `/dashboard` (index), `vehicles`, `drivers`, `closure`, `incidents`, `maintenance`, `reports`, `invitations`, `settings`, `profile`, `teams`, `create-fleet`, `finances`, `collections`, `alerts`, `roles`, `my-vehicle`, `history`.

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
