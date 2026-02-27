# 👥 Gestion des Membres et Autorisations - Smart Fleet Africa

## 📋 Vue d'ensemble

Ce document détaille la création, la gestion et le contrôle des membres d'une flotte, ainsi que le système d'autorisations basé sur les rôles.

## 🚀 Création des membres d'une flotte

### 1. Interface Utilisateur

- Accédez à la page « Équipes » (/dashboard/teams) après connexion.
- Seuls les **Organisateurs** ou **Managers** peuvent ajouter des membres.
- Cliquez sur « Ajouter un membre », saisissez l’**email** du futur membre (compte nécessaire existant), sélectionnez le **rôle** :
    - **Organisateur** : tous droits
    - **Manager** : gestion courante
    - **Chauffeur** : conduite, courses
    - **Mécanicien** : maintenance
- Validez avec « Ajouter le membre ».
- Gérer un membre : menu ⋯ > « Définir comme… » (changer rôle) ou « Retirer de l’équipe ».

### 2. Par Invitation

- Accédez à `/dashboard/invitations`.
- Cliquez sur « Créer une invitation ».
- Définissez la validité du code (expiration, limites) et partagez-le à l’utilisateur.
- L’utilisateur crée son compte (ou se connecte) puis renseigne ce code lors de l’inscription.
- Il rejoint la flotte avec le rôle **driver** par défaut.

### 3. Par SQL (Administrateur seulement)

```sql
-- 1. Récupérer l’ID utilisateur par email
SELECT id FROM auth.users WHERE email = 'utilisateur@example.com';

-- 2. Ajouter le membre à la flotte (table française flotte_adhesions)
SELECT public.creer_ou_mettre_a_jour_adhesion_flotte(
  'fleet_id_ici'::uuid,
  'user_id_ici'::uuid,
  'manager'::role_type,  -- organizer, manager, driver, mechanic
  true  -- is_active
);
```

## 🔐 Autorisations par rôle

### Organisateur (organizer)

- Gestion complète de l’équipe (ajouter, retirer, modifier, changer les rôles)
- Gestion totale des véhicules (créer, modifier, supprimer, assigner, bloquer)
- Créer/modifier/supprimer des invitations, voir leur historique
- Valider/rejeter toutes les clôtures journalières
- Création et validation de travaux de maintenance, gestion des checklists
- Accès intégral aux rapports, statistiques, export
- Modifier les paramètres de flotte, gérer les politiques

### Manager (manager)

- Presque comme l’organisateur, sauf :
    - Ne peut pas modifier les paramètres de la flotte
    - Ne peut pas nommer un autre membre « organizer »
- Gestion équipe, véhicules, invitations, maintenance, clôtures, rapports/statistiques

### Chauffeur (driver)

- Accès limité à ses propres véhicules, courses et historiques
- Peut créer des courses, clore ses journées
- Peut déclarer et voir SES incidents, consulter ses stats et historiques
- Ne peut ni gérer l’équipe, ni modifier des véhicules, ni inviter

### Mécanicien (mechanic)

- Accès à la maintenance (jobs, validations, checklists, preuves)
- Peut consulter TOUS les véhicules et leur historique
- Voir tous les incidents
- Ne gère pas l’équipe, ne peut ni assigner des véhicules ni valider des clôtures

## 🔄 Modification du rôle

Via interface :
- Page `/dashboard/teams`, menu ⋯, « Définir comme… » (changement immédiat).

Via SQL :
```sql
SELECT public.creer_ou_mettre_a_jour_adhesion_flotte(
  'fleet_id_ici'::uuid,
  'user_id_ici'::uuid,
  'nouveau_role'::role_type,
  true
);
```
> Remarque : un utilisateur peut avoir plusieurs rôles dans une flotte (`fleet_memberships` a une contrainte unique `(fleet_id, user_id, role)`). Utilisez `upsert_fleet_membership` pour remplacer ou ajouter un rôle.

## 🚫 Retrait d’un membre

Via interface :
- Page `/dashboard/teams`, menu ⋯, « Retirer de l’équipe ».

Via SQL :
```sql
UPDATE flotte_adhesions
SET is_active = false
WHERE fleet_id = 'fleet_id_ici'::uuid AND user_id = 'user_id_ici'::uuid;

SELECT public.creer_ou_mettre_a_jour_adhesion_flotte(
  'fleet_id_ici'::uuid,
  'user_id_ici'::uuid,
  'driver'::role_type,
  false
);
```

## 🔍 Consultation des membres d’une flotte

Via interface : 
- `/dashboard/teams`, liste des membres actifs affichée directement.

Via SQL :
```sql
SELECT 
  fa.id,
  fa.role,
  fa.is_active,
  p.full_name,
  p.phone,
  u.email,
  fa.created_at
FROM flotte_adhesions fa
JOIN flottes f ON f.id = fa.fleet_id
LEFT JOIN profils p ON p.user_id = fa.user_id
LEFT JOIN auth.users u ON u.id = fa.user_id
WHERE f.name = 'Nom de la flotte'
  AND fa.is_active = true
ORDER BY fa.created_at DESC;
```

## ⚠️ Rappels importants

- Un utilisateur peut avoir plusieurs rôles, mais pas deux fois le même rôle dans une flotte.
- Utiliser `creer_ou_mettre_a_jour_adhesion_flotte` pour toute modification des rôles ou statut.
- Les droits sont gérés via RLS (Row Level Security) : seuls organizer et manager peuvent ajouter des membres.
- La fonction `add_member_by_email` valide automatiquement les droits.
- Les emails ne sont pas exposés publiquement.

## 🛠️ Fonctions RPC principales

- `add_member_by_email(p_fleet_id, p_email, p_role)` : ajoute un membre via son email. Permissions : organizer/manager. Retourne l’UUID du nouveau membership.
- `creer_ou_mettre_a_jour_adhesion_flotte(p_fleet_id, p_user_id, p_role, p_is_active)` : insertion ou mise à jour atomique d’un membre (gère toutes les contraintes) sur `flotte_adhesions`. Retourne l’UUID.

## 📚 Ressources

- [Page Teams](/dashboard/teams) : gestion membres
- [Page Invitations](/dashboard/invitations) : codes d’invitation
- [Schéma BDD](./DATABASE-SCHEMA-SUMMARY.md) : documentation complète

## ✅ Checklist création équipe

- [ ] Créer une flotte (ou utiliser existante)
- [ ] Ajouter des membres (UI ou invitations)
- [ ] Rôles appropriés attribués
- [ ] Permissions vérifiées
- [ ] Fonctionnalités testées par rôle
- [ ] Documentation tenue à jour

**Dernière mise à jour :** 2026
