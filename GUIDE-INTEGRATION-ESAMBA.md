# 🚀 Guide d'Intégration Complète ESAMBA

## 📋 Objectif

Ce guide vous permet d'intégrer tous les profils, équipes et véhicules liés à l'organisation ESAMBA dans votre profil organisateur et de tester que tout fonctionne correctement.

## ✅ Prérequis

- Accès à Supabase SQL Editor
- Compte utilisateur avec au moins un organisateur dans la base de données
- Les migrations de base de données sont à jour

## 🔧 Étape 1 : Exécuter le script d'intégration

### 1.1 Ouvrir Supabase SQL Editor

1. Allez sur https://app.supabase.com
2. Sélectionnez votre projet
3. Cliquez sur "SQL Editor" dans le menu latéral

### 1.2 Exécuter le script d'intégration

1. Ouvrez le fichier `supabase/integration-complete-esamba.sql`
2. Copiez tout le contenu
3. Collez-le dans l'éditeur SQL de Supabase
4. Cliquez sur "Run" ou appuyez sur `F5`

### 1.3 Vérifier les résultats

Le script affichera des messages dans les logs Supabase. Vous devriez voir :

```
✅ Organisation ESAMBA créée/existe déjà
✅ Flotte ESAMBA créée/existe déjà
✅ Véhicule ESAMBA-001 créé/existe déjà
✅ Véhicule ESAMBA-002 créé/existe déjà
✅ Véhicule ESAMBA-003 créé/existe déjà
✅ Profils créés pour X utilisateurs
✅ Rôles assignés aux membres
✅ Invitation ESAMBA-2024 créée/existe déjà
```

## 🧪 Étape 2 : Tester l'intégration

### 2.1 Exécuter le script de test

1. Dans Supabase SQL Editor, ouvrez le fichier `supabase/test-integration-esamba.sql`
2. Copiez tout le contenu
3. Collez-le dans l'éditeur SQL
4. Cliquez sur "Run"

### 2.2 Analyser les résultats

Le script affichera 7 tests :

1. **TEST 1: ORGANISATION** - Vérifie que l'organisation ESAMBA existe
2. **TEST 2: FLOTTE** - Vérifie que la flotte ESAMBA existe
3. **TEST 3: VÉHICULES** - Vérifie qu'au moins 3 véhicules sont créés
4. **TEST 4: PROFILS** - Vérifie que les profils utilisateurs sont créés
5. **TEST 5: MEMBRES FLOTTE** - Vérifie que des membres sont assignés à la flotte
6. **TEST 6: INVITATION** - Vérifie que l'invitation ESAMBA-2024 existe
7. **TEST 7: FONCTION RPC** - Vérifie que la fonction `check_esamba_2024` existe

Tous les tests doivent afficher **✅ PASSÉ** pour que l'intégration soit complète.

## 🌐 Étape 3 : Tester dans l'application

### 3.1 Lancer l'application

```bash
npm run dev
```

### 3.2 Se connecter en tant qu'organisateur

1. Ouvrez http://localhost:8080 (ou le port configuré)
2. Connectez-vous avec un compte qui a le rôle "organisateur"

### 3.3 Vérifier la page Paramètres

1. Allez sur `/dashboard/settings`
2. Dans la section **"Vérification des données"** :
   - Cliquez sur "Actualiser"
   - Vérifiez que tous les éléments sont marqués **✅ Créée** :
     - ✅ Organisation ESAMBA
     - ✅ Flotte ESAMBA
     - ✅ Membership Organizer
     - ✅ Véhicule ESAMBA-001
     - ✅ Invitation ESAMBA-2024

3. Dans la section **"Mon espace organisateur"** :
   - Cliquez sur "Actualiser"
   - Vérifiez que tous les membres de la flotte sont affichés avec leurs rôles :
     - Organisateurs
     - Gestionnaires
     - Chauffeurs
     - Mécaniciens

### 3.4 Vérifier la page Équipes

1. Allez sur `/dashboard/teams`
2. Vérifiez que tous les membres de la flotte ESAMBA sont listés
3. Vérifiez que leurs rôles sont correctement affichés
4. Testez l'ajout d'un nouveau membre si nécessaire

### 3.5 Vérifier la page Véhicules

1. Allez sur `/dashboard/vehicles`
2. Vérifiez que les véhicules suivants sont listés :
   - ESAMBA-001 (Toyota Corolla)
   - ESAMBA-002 (Honda Civic)
   - ESAMBA-003 (Nissan Sentra)

## 📊 Données créées

Le script d'intégration crée :

### Organisation
- **Nom** : Organisation ESAMBA
- **Code pays** : CM (Cameroun)

### Flotte
- **Nom** : Flotte ESAMBA
- **Politique de collecte** : mix (cash + mobile money)

### Véhicules
- **ESAMBA-001** : Toyota Corolla 2020 (15 000 km)
- **ESAMBA-002** : Honda Civic 2021 (12 000 km)
- **ESAMBA-003** : Nissan Sentra 2019 (25 000 km)

### Membres
- Tous les utilisateurs existants sont assignés à la flotte avec différents rôles :
  - **Organisateur** : Accès complet
  - **Gestionnaire** : Gestion opérationnelle
  - **Chauffeur** : Conduite et courses
  - **Mécanicien** : Maintenance

### Invitation
- **Code** : ESAMBA-2024
- **Expiration** : Aucune
- **Limite d'utilisation** : Aucune

## 🔍 Dépannage

### Problème : Les tests échouent

**Solution** :
1. Vérifiez que le script d'intégration a été exécuté complètement
2. Vérifiez les logs Supabase pour les erreurs
3. Assurez-vous que les migrations sont à jour
4. Vérifiez que les tables existent (organisations, flottes, vehicules, flotte_adhesions, etc.)

### Problème : Aucun membre n'apparaît dans l'application

**Solution** :
1. Vérifiez que vous êtes connecté avec un compte qui a le rôle "organisateur"
2. Vérifiez que votre compte est bien assigné à la flotte ESAMBA
3. Rafraîchissez la page après avoir exécuté le script SQL
4. Vérifiez les permissions RLS dans Supabase

### Problème : Les véhicules n'apparaissent pas

**Solution** :
1. Vérifiez que les véhicules ont été créés dans la base de données
2. Vérifiez que vous avez les permissions pour voir les véhicules
3. Vérifiez que la flotte ESAMBA existe et que vous y êtes membre

### Problème : La fonction RPC check_esamba_2024 n'existe pas

**Solution** :
1. Exécutez le script `supabase/rpc-check-esamba-2024.sql` dans Supabase SQL Editor
2. Ou exécutez `supabase/fix-all-issues-complete.sql` qui contient toutes les fonctions RPC nécessaires

## 📝 Notes importantes

- Le script est **idempotent** : vous pouvez l'exécuter plusieurs fois sans créer de doublons
- Les données existantes ne seront pas supprimées, seulement vérifiées/créées
- Les profils utilisateurs sont créés automatiquement pour tous les utilisateurs existants
- Les membres sont assignés à la flotte avec des rôles cycliques (organizer, manager, driver, driver, mechanic)

## ✅ Checklist finale

Avant de considérer l'intégration comme terminée, vérifiez :

- [ ] Le script d'intégration s'est exécuté sans erreur
- [ ] Tous les tests SQL sont passés (7/7)
- [ ] La page Paramètres affiche tous les éléments comme "Créée"
- [ ] La section "Mon espace organisateur" affiche tous les membres
- [ ] La page Équipes liste tous les membres avec leurs rôles
- [ ] La page Véhicules liste les 3 véhicules ESAMBA
- [ ] Vous pouvez ajouter un nouveau membre via l'interface
- [ ] L'invitation ESAMBA-2024 fonctionne pour inviter de nouveaux utilisateurs

## 🎉 Félicitations !

Si tous les éléments de la checklist sont cochés, l'intégration est complète et fonctionnelle. Vous pouvez maintenant utiliser l'application avec tous les profils, équipes et véhicules de l'organisation ESAMBA.
