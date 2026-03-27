# Guide d'interprétation du rapport de vérification de migration

Ce guide vous explique comment utiliser et interpréter le script de vérification de la migration vers le français (`verify-migration-status.sql`).

## �??? Introduction

Le script `verify-migration-status.sql` génère un rapport structuré qui vérifie l'état complet de la migration de votre base de données vers les noms français. Il identifie automatiquement les problèmes et génère des commandes SQL de correction.

## �??? Comment exécuter le script

### Option 1 : Via npm script (Recommandé)

```bash
npm run verify:migration
```

Cette commande lance le script PowerShell qui vous guide à travers les options d'exécution.

### Option 2 : Via PowerShell directement

```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify-migration-status.ps1
```

### Option 3 : Via tableau de bord Supabase

1. Connectez-vous à [tableau de bord Supabase](https://app.supabase.com)
2. Sélectionnez votre projet
3. Allez dans **�diteur SQL** (menu de gauche)
4. Ouvrez le fichier `supabase/verify-migration-status.sql`
5. Copiez tout le contenu et collez-le dans l'éditeur SQL
6. Cliquez sur **Ex�cuter** (ou `Ctrl+Enter` / `Cmd+Enter`)

### Option 4 : Via Supabase CLI

```bash
supabase db execute --file supabase/verify-migration-status.sql
```

## �??? Structure du rapport

Le rapport généré contient **7 sections** principales :

1. **Résumé exécutif** - Vue d'ensemble avec statistiques
2. **Vérification des tables françaises** - Détail de chaque table attendue
3. **Détection des doublons** - Tables anglaises restantes
4. **Vérification des fonctions RPC** - Fonctions françaises et anciennes
5. **Vérification des index** - Index français et anciens
6. **Vérification des politiques RLS** - Politiques françaises et anciennes
7. **Recommandations SQL** - Commandes de correction générées automatiquement

---

## �??? Interprétation détaillée des sections

### Section 1 : Résumé exécutif

**Ce que cette section vérifie :**
- Le nombre total de tables françaises attendues (15 tables)
- Le nombre de tables françaises trouvées dans la base de données
- Le nombre de tables anglaises restantes (doublons)
- Le pourcentage de complétion de la migration
- Le statut global (�?? Succès / �?�️ Avertissements / �? Erreurs)

**Comment interpréter les résultats :**

| Statut | Signification | Action requise |
|--------|---------------|----------------|
| �?? SUCC�?S | Toutes les tables françaises sont présentes, aucune table anglaise restante | Aucune action requise |
| �?�️ AVERTISSEMENTS | Des doublons sont détectés (tables anglaises + françaises coexistantes) | Supprimer les tables anglaises (voir Section 3) |
| �? ERREURS | Des tables françaises manquent | Relancer la migration complète |

**Exemple de sortie réussie :**
```
�??? STATISTIQUES GLOBALES
Tables françaises attendues: 15
Tables françaises trouvées: 15
Tables anglaises restantes (doublons): 0
Pourcentage de complétion: 100%
Statut global: �?? SUCC�?S
```

**Exemple avec problèmes :**
```
�??? STATISTIQUES GLOBALES
Tables françaises attendues: 15
Tables françaises trouvées: 12
Tables anglaises restantes (doublons): 3
Pourcentage de complétion: 80%
Statut global: �?�️ AVERTISSEMENTS
```

---

### Section 2 : Vérification détaillée des tables françaises

**Ce que cette section vérifie :**
- L'existence de chaque table française attendue
- La priorité de chaque table (CRITIQUE, IMPORTANT, INFO)
- Les messages d'action pour chaque table

**Colonnes du rapport :**

- **statut** : �?? (présente) ou �? (manquante)
- **Table française** : Nom de la table française attendue
- **Ancien nom** : Nom de la table anglaise correspondante
- **Priorité** :
  - `CRITIQUE` : Tables essentielles au fonctionnement de l'application
  - `IMPORTANT` : Tables importantes mais non bloquantes
  - `INFO` : Tables optionnelles ou pour fonctionnalités futures
- **Message d'action** : Action recommandée si la table est manquante

**Comment interpréter :**

- �?? **OK - Table présente** : La table existe, aucune action requise
- �? **ACTION REQUISE - Table manquante** : La table n'existe pas, relancer la migration

**Exemple de sortie :**
```
statut | Table française        | Ancien nom              | Priorité | Message d'action
-------|------------------------|-------------------------|----------|------------------
�??     | organisations          | orgs                    | CRITIQUE | OK - Table présente
�??     | flottes                | fleets                  | CRITIQUE | OK - Table présente
�?     | vehicules              | vehicles                | CRITIQUE | ACTION REQUISE - Table manquante
```

**Que faire en cas de problème :**
- Si des tables CRITIQUE sont manquantes : **Relancer la migration complète** (`20241202000000_migrate_to_french.sql`)
- Si des tables IMPORTANT ou INFO sont manquantes : Vérifier si elles sont nécessaires pour votre cas d'usage

---

### Section 3 : Détection des doublons

**Ce que cette section vérifie :**
- Les tables anglaises qui existent encore dans la base de données
- Les doublons (tables anglaises + françaises coexistantes)
- Les commandes SQL suggérées pour supprimer les doublons

**Colonnes du rapport :**

- **statut** :
  - �?�️ DOUBLON D�?TECT�? : Table anglaise ET française existent
  - �?�️ ANCIENNE TABLE EXISTE : Seule la table anglaise existe
  - �?? OK : Aucune table anglaise restante
- **Table anglaise** : Nom de l'ancienne table
- **Table française correspondante** : Nom de la nouvelle table française
- **Commande de correction suggérée** : Commande SQL prête à exécuter

**Comment interpréter :**

- �?�️ **DOUBLON D�?TECT�?** : Les deux tables existent. **Action requise** : Supprimer la table anglaise avec la commande suggérée
- �?�️ **ANCIENNE TABLE EXISTE** : Seule la table anglaise existe. **Action requise** : Renommer la table avec la commande suggérée
- �?? **OK** : Aucune table anglaise restante

**Exemple de sortie avec doublons :**
```
statut              | Table anglaise          | Table française correspondante | Commande de correction
--------------------|-------------------------|-------------------------------|----------------------
�?�️ DOUBLON D�?TECT�? | vehicles                | vehicules                     | SUPPRIMER: DROP TABLE IF EXISTS vehicles CASCADE;
�?�️ DOUBLON D�?TECT�? | fleet_memberships       | flotte_adhesions              | SUPPRIMER: DROP TABLE IF EXISTS fleet_memberships CASCADE;
```

**Que faire en cas de problème :**
1. **Vérifier les données** : Avant de supprimer une table anglaise, vérifiez qu'elle ne contient pas de données importantes
2. **Exécuter les commandes suggérées** : Copiez les commandes SQL de la colonne "Commande de correction suggérée" et exécutez-les dans Supabase �diteur SQL
3. **Relancer le script** : Après avoir supprimé les doublons, relancez le script pour vérifier que tout est correct

---

### Section 4 : Vérification des fonctions RPC

**Ce que cette section vérifie :**
- L'existence des fonctions RPC françaises attendues
- Les signatures et paramètres des fonctions
- Les anciennes fonctions RPC à supprimer

**Fonctions vérifiées :**
- `affecter_vehicule` (anciennement `assign_vehicle`)
- `fermer_creneau` (anciennement `close_shift`)
- `rechercher_utilisateurs` (anciennement `search_users`)
- `has_role` (vérification des paramètres)

**Colonnes du rapport :**

- **statut** : �?? (présente) ou �? (manquante)
- **Fonction française** : Nom de la fonction française attendue
- **Ancien nom** : Nom de l'ancienne fonction anglaise
- **Priorité** : CRITIQUE ou IMPORTANT
- **Message d'action** : Action recommandée

**Vérification spéciale : `has_role`**

Le script vérifie également les paramètres de la fonction `has_role` :
- �?? **Paramètre correct (p_flotte_id)** : La fonction utilise le bon nom de paramètre français
- �?�️ **Paramètre incorrect (p_fleet_id)** : La fonction utilise encore l'ancien nom de paramètre anglais

**Exemple de sortie :**
```
statut | Fonction française      | Ancien nom      | Priorité | Message d'action
-------|-------------------------|-----------------|----------|------------------
�??     | affecter_vehicule       | assign_vehicle  | CRITIQUE | OK - Fonction présente
�??     | fermer_creneau          | close_shift     | CRITIQUE | OK - Fonction présente
�?     | rechercher_utilisateurs | search_users    | IMPORTANT| ACTION REQUISE - Fonction manquante
```

**Que faire en cas de problème :**
- Si une fonction CRITIQUE est manquante : Relancer la migration complète
- Si `has_role` a le mauvais paramètre : Exécuter la commande DROP FUNCTION puis recréer la fonction avec le bon paramètre

---

### Section 5 : Vérification des index

**Ce que cette section vérifie :**
- Les index français créés sur les tables migrées
- Les anciens index anglais à supprimer

**Colonnes du rapport :**

- **Schéma** : Généralement `public`
- **Table** : Nom de la table
- **Index** : Nom de l'index
- **Statut** : �?? Index français ou �?�️ Index à vérifier

**Exemple de sortie :**
```
Schéma | Table                | Index                              | Statut
-------|----------------------|------------------------------------|------------------
public | vehicules            | idx_vehicules_fleet_id            | �?? Index français
public | vehicules            | idx_vehicules_status              | �?? Index français
public | flotte_adhesions     | idx_flotte_adhesions_user_id      | �?? Index français
```

**Détection des anciens index :**

Le script liste également les anciens index anglais qui doivent être supprimés :
```
�?�️ | public | vehicles | idx_vehicles_fleet_id | DROP INDEX IF EXISTS public.idx_vehicles_fleet_id;
```

**Que faire en cas de problème :**
- Les anciens index peuvent être supprimés en toute sécurité une fois que les nouveaux index français sont créés
- Utilisez les commandes DROP INDEX suggérées dans la section "ANCIENS INDEX"

---

### Section 6 : Vérification des politiques RLS

**Ce que cette section vérifie :**
- Les politiques RLS françaises créées sur les tables migrées
- Les anciennes politiques RLS anglaises à supprimer

**Colonnes du rapport :**

- **Schéma** : Généralement `public`
- **Table** : Nom de la table
- **Politique** : Nom de la politique RLS
- **Statut** : �?? Politique française ou �?�️ Politique à vérifier

**Exemple de sortie :**
```
Schéma | Table                | Politique                          | Statut
-------|----------------------|------------------------------------|------------------
public | vehicules           | vehicules_lecture_manager_org       | �?? Politique française
public | vehicules           | vehicules_ecriture_manager_org     | �?? Politique française
public | flotte_adhesions    | adhesions_lecture_soi              | �?? Politique française
```

**Détection des anciennes politiques :**

Le script liste également les anciennes politiques anglaises qui doivent être supprimées :
```
�?�️ | public | vehicles | vehicles_read_manager_org | DROP POLICY IF EXISTS vehicles_read_manager_org ON public.vehicles;
```

**Que faire en cas de problème :**
- Les anciennes politiques peuvent être supprimées une fois que les nouvelles politiques françaises sont créées
- Utilisez les commandes DROP POLICY suggérées dans la section "ANCIENNES POLITIQUES RLS"

---

### Section 7 : Recommandations SQL automatiques

**Ce que cette section génère :**
- Des commandes SQL prêtes à exécuter pour corriger les problèmes détectés
- Des commandes DROP TABLE pour supprimer les doublons
- Des commandes DROP FUNCTION pour supprimer les anciennes fonctions

**Format de sortie :**

```sql
-- Supprimer les tables anglaises restantes (doublons)
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS fleet_memberships CASCADE;
DROP TABLE IF EXISTS driver_shift_closures CASCADE;

-- Supprimer les anciennes fonctions RPC
DROP FUNCTION IF EXISTS assign_vehicle CASCADE;
DROP FUNCTION IF EXISTS close_shift CASCADE;
```

**Comment utiliser :**

1. **Copiez les commandes** générées dans cette section
2. **Vérifiez les commandes** avant de les exécuter (surtout les DROP TABLE)
3. **Exécutez dans Supabase �diteur SQL** :
   - Ouvrez �diteur SQL dans tableau de bord Supabase
   - Collez les commandes
   - Cliquez sur Ex�cuter
4. **Relancez le script** pour vérifier que les problèmes sont résolus

**�?�️ Précautions importantes :**

- **Sauvegardez vos données** avant d'exécuter des commandes DROP TABLE
- **Vérifiez les dépendances** : Les commandes avec CASCADE supprimeront également les objets dépendants
- **Testez d'abord en environnement de développement** si possible

---

## �??� Exemples pratiques

### Exemple 1 : Rapport réussi (migration complète)

```
�??? STATISTIQUES GLOBALES
Tables françaises attendues: 15
Tables françaises trouvées: 15
Tables anglaises restantes (doublons): 0
Pourcentage de complétion: 100%
Statut global: �?? SUCC�?S
```

**Interprétation :** La migration est complète. Toutes les tables françaises sont présentes et aucune table anglaise ne reste.

**Action :** Aucune action requise.

---

### Exemple 2 : Rapport avec doublons détectés

```
�??? STATISTIQUES GLOBALES
Tables françaises attendues: 15
Tables françaises trouvées: 15
Tables anglaises restantes (doublons): 3
Pourcentage de complétion: 100%
Statut global: �?�️ AVERTISSEMENTS
```

**Section 3 - Détection des doublons :**
```
�?�️ DOUBLON D�?TECT�? | vehicles | vehicules | SUPPRIMER: DROP TABLE IF EXISTS vehicles CASCADE;
�?�️ DOUBLON D�?TECT�? | fleet_memberships | flotte_adhesions | SUPPRIMER: DROP TABLE IF EXISTS fleet_memberships CASCADE;
�?�️ DOUBLON D�?TECT�? | driver_shift_closures | clotures_creneaux | SUPPRIMER: DROP TABLE IF EXISTS driver_shift_closures CASCADE;
```

**Interprétation :** Les tables françaises sont toutes présentes, mais certaines tables anglaises existent encore (doublons).

**Action :**
1. Vérifiez que les tables anglaises ne contiennent pas de données importantes
2. Exécutez les commandes DROP TABLE suggérées dans la Section 7
3. Relancez le script pour vérifier

---

### Exemple 3 : Rapport avec tables manquantes

```
�??? STATISTIQUES GLOBALES
Tables françaises attendues: 15
Tables françaises trouvées: 12
Tables anglaises restantes (doublons): 0
Pourcentage de complétion: 80%
Statut global: �? ERREURS
```

**Section 2 - Tables françaises :**
```
�? | vehicules | vehicles | CRITIQUE | ACTION REQUISE - Table manquante
�? | affectations_vehicules | driver_vehicle_assignments | CRITIQUE | ACTION REQUISE - Table manquante
�? | creneaux_conducteurs | driver_shifts | CRITIQUE | ACTION REQUISE - Table manquante
```

**Interprétation :** Certaines tables françaises critiques sont manquantes. La migration n'est pas complète.

**Action :**
1. Relancez la migration complète : `20241202000000_migrate_to_french.sql`
2. Vérifiez les erreurs éventuelles lors de l'exécution
3. Relancez ce script de vérification après la migration

---

## �??� Dépannage

### Problème : Le script ne s'exécute pas

**Solutions :**
- Vérifiez que vous êtes connecté à Supabase
- Vérifiez que vous avez les droits d'administration sur le projet
- Essayez d'exécuter le script section par section dans Supabase �diteur SQL

### Problème : Des tables sont marquées comme manquantes mais elles existent

**Solutions :**
- Vérifiez que les tables sont dans le schéma `public`
- Vérifiez l'orthographe exacte des noms de tables (sensible à la casse)
- Exécutez cette requête pour vérifier :
  ```sql
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'vehicules';
  ```

### Problème : Les commandes DROP TABLE échouent

**Solutions :**
- Vérifiez que vous avez les droits nécessaires
- Vérifiez les dépendances (foreign keys, vues, etc.)
- Utilisez `CASCADE` pour supprimer automatiquement les dépendances
- Vérifiez qu'aucune session active n'utilise ces tables

### Problème : Le pourcentage de complétion est incorrect

**Solutions :**
- Le script compte uniquement les 15 tables principales
- Les tables optionnelles (comme `incidents`) ne sont pas comptées dans le total
- C'est normal si certaines tables optionnelles n'existent pas encore

---

## �?? Bonnes pratiques

### Quand exécuter ce script

1. **Après chaque migration** : Vérifiez que la migration s'est bien déroulée
2. **Avant un déploiement en production** : Assurez-vous que tout est migré
3. **Après avoir supprimé des doublons** : Vérifiez que les problèmes sont résolus
4. **Régulièrement** : Pour maintenir la cohérence de la base de données

### Fréquence recommandée

- **Après chaque migration** : �?? Obligatoire
- **Avant chaque déploiement** : �?? Recommandé
- **Mensuellement** : �?? Pour maintenance préventive

### Workflow recommandé

1. Exécutez le script de vérification
2. Analysez le rapport (sections 1-6)
3. Si des problèmes sont détectés :
   - Copiez les commandes de la Section 7
   - Vérifiez les commandes
   - Exécutez-les dans Supabase �diteur SQL
4. Relancez le script pour vérifier que tout est corrigé
5. Documentez les actions effectuées

---

## �??? Ressources supplémentaires

- **Script de migration** : `supabase/migrations/20241202000000_migrate_to_french.sql`
- **Script PowerShell** : `scripts/verify-migration-status.ps1`
- **Guide de migration** : `GUIDE-MIGRATION-SEARCH-USERS.md` (exemple de format)

---

## �? Questions fréquentes

**Q : Le script modifie-t-il ma base de données ?**
R : Non, le script est en lecture seule. Il génère uniquement un rapport et des recommandations.

**Q : Puis-je exécuter ce script plusieurs fois ?**
R : Oui, le script est idempotent et peut être exécuté autant de fois que nécessaire.

**Q : Que faire si je vois des doublons mais que je ne suis pas sûr de supprimer les tables anglaises ?**
R : Sauvegardez d'abord vos données, puis vérifiez que les tables françaises contiennent bien toutes les données nécessaires avant de supprimer les tables anglaises.

**Q : Le script vérifie-t-il les données dans les tables ?**
R : Non, le script vérifie uniquement la structure (tables, fonctions, index, politiques). Il ne vérifie pas le contenu des tables.

---

**Dernière mise à jour :** 2024-12-02
