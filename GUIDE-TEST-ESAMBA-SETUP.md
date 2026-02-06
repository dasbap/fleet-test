# Guide : Création et Vérification des Données ESAMBA

Ce guide explique comment créer et vérifier toutes les données ESAMBA nécessaires pour tester l'application.

## 📋 Vue d'ensemble

Les données ESAMBA comprennent :
- **Organisation ESAMBA** : L'organisation principale
- **Flotte ESAMBA** : La flotte de véhicules
- **Véhicules** : Au moins 3 véhicules de test (ESAMBA-001, ESAMBA-002, ESAMBA-003)
- **Membres** : Utilisateurs avec différents rôles (organizer, manager, driver, mechanic)
- **Profils** : Profils utilisateurs avec noms complets et téléphones

## 🚀 Méthode 1 : Via l'interface (Recommandé)

### Étape 1 : Se connecter à l'application

1. Ouvrez l'application : `https://smart-fleet-africa.vercel.app`
2. Connectez-vous avec votre compte utilisateur

### Étape 2 : Créer les données ESAMBA

1. Allez sur `/dashboard/settings`
2. Dans la section "Données de démo ESAMBA", cliquez sur le bouton **"Créer les données ESAMBA-2024"**
3. Attendez que la création soit terminée (vous verrez un message de succès)

### Étape 3 : Vérifier les données

1. Toujours sur `/dashboard/settings`, vérifiez la section **"Mon espace organisateur"**
2. Vous devriez voir :
   - Tous les profils de la flotte
   - Leurs rôles respectifs
   - Le nombre total de membres

## 🛠️ Méthode 2 : Via SQL (Pour les développeurs)

### Étape 1 : Ouvrir Supabase SQL Editor

1. Allez sur https://app.supabase.com
2. Sélectionnez votre projet
3. Cliquez sur **"SQL Editor"** dans le menu de gauche

### Étape 2 : Exécuter le script de création

1. Ouvrez le fichier `supabase/setup-esamba-complete.sql`
2. Copiez tout le contenu
3. Collez-le dans l'éditeur SQL de Supabase
4. Cliquez sur **"Run"** ou appuyez sur `F5`

Le script va :
- ✅ Créer l'Organisation ESAMBA si elle n'existe pas
- ✅ Créer la Flotte ESAMBA si elle n'existe pas
- ✅ Créer 3 véhicules (ESAMBA-001, ESAMBA-002, ESAMBA-003)
- ✅ Créer les profils pour tous les utilisateurs existants
- ✅ Assigner automatiquement des rôles aux utilisateurs

### Étape 3 : Vérifier avec le script de vérification

1. Ouvrez le fichier `supabase/verify-esamba-setup.sql`
2. Copiez tout le contenu
3. Collez-le dans l'éditeur SQL de Supabase
4. Cliquez sur **"Run"**

Le script affichera :
- ✅ Statut de l'organisation
- ✅ Statut de la flotte
- ✅ Liste des véhicules
- ✅ Liste des membres avec leurs rôles
- ✅ Statistiques complètes

## 📊 Structure des données créées

### Organisation
- **Nom** : Organisation ESAMBA
- **Code pays** : CM (Cameroun)

### Flotte
- **Nom** : Flotte ESAMBA
- **Politique de collecte** : mix (cash + mobile money)

### Véhicules
| Immatriculation | Marque | Modèle | Année | Kilométrage |
|----------------|--------|--------|-------|-------------|
| ESAMBA-001     | Toyota | Corolla| 2020  | 15000 km    |
| ESAMBA-002     | Honda  | Civic  | 2021  | 12000 km    |
| ESAMBA-003     | Nissan | Sentra | 2019  | 25000 km    |

### Rôles assignés

Les utilisateurs existants dans `auth.users` recevront automatiquement des rôles dans cet ordre :
1. **Organisateur** (organizer) - Premier utilisateur
2. **Gestionnaire** (manager) - Deuxième utilisateur
3. **Chauffeur** (driver) - Troisième utilisateur
4. **Chauffeur** (driver) - Quatrième utilisateur
5. **Mécanicien** (mechanic) - Cinquième utilisateur

## ✅ Tests à effectuer

### Test 1 : Vérifier l'affichage des profils

1. Allez sur `/dashboard/settings`
2. Vérifiez la section **"Mon espace organisateur"**
3. Vous devriez voir :
   - ✅ Tous les profils de la flotte
   - ✅ Leurs noms complets
   - ✅ Leurs téléphones (si renseignés)
   - ✅ Tous leurs rôles avec badges colorés
   - ✅ Le compteur total de profils

### Test 2 : Vérifier les différents rôles

1. Connectez-vous avec différents comptes utilisateurs
2. Vérifiez que chaque utilisateur voit :
   - ✅ Son propre profil dans la liste
   - ✅ Ses rôles correctement affichés
   - ✅ Les autres membres de la flotte

### Test 3 : Vérifier le groupement par utilisateur

Si un utilisateur a plusieurs rôles dans la même flotte :
- ✅ Tous les rôles doivent être affichés
- ✅ Chaque rôle doit avoir son propre badge
- ✅ Les rôles inactifs doivent être indiqués

### Test 4 : Vérifier les cas limites

1. **Pas de flotte** :
   - ✅ Un message informatif doit s'afficher
   - ✅ Le bouton "Actualiser" doit être disponible

2. **Aucun membre** :
   - ✅ Un message informatif doit s'afficher
   - ✅ Des instructions doivent être fournies

3. **Erreur de chargement** :
   - ✅ Un message d'erreur doit s'afficher
   - ✅ Un bouton "Réessayer" doit être disponible

## 🔧 Dépannage

### Problème : Les données ne s'affichent pas

**Solution** :
1. Vérifiez que vous êtes connecté avec un compte utilisateur
2. Vérifiez que vous avez un membership actif dans la flotte ESAMBA
3. Exécutez le script de vérification SQL pour voir l'état actuel
4. Rafraîchissez la page dans l'application

### Problème : Les rôles ne s'affichent pas correctement

**Solution** :
1. Vérifiez que les membres ont bien des rôles actifs dans `flotte_adhesions`
2. Vérifiez que les profils existent dans la table `profils`
3. Exécutez le script de vérification pour voir les détails

### Problème : Le script SQL échoue

**Solution** :
1. Vérifiez que vous avez les permissions nécessaires
2. Vérifiez que les tables existent (organisations, flottes, vehicules, profils, flotte_adhesions)
3. Vérifiez que les fonctions RPC existent (upsert_fleet_membership, create_esamba_fleet, etc.)

## 📝 Notes importantes

- Les scripts utilisent les **noms de tables français** (organisations, flottes, vehicules, profils, flotte_adhesions)
- Les fonctions RPC peuvent encore utiliser les anciens noms de tables (elles fonctionnent grâce à SECURITY DEFINER)
- Les profils sont créés automatiquement pour tous les utilisateurs existants
- Les rôles sont assignés automatiquement selon l'ordre d'apparition des utilisateurs

## 🔗 Fichiers associés

- `supabase/setup-esamba-complete.sql` : Script de création complète
- `supabase/verify-esamba-setup.sql` : Script de vérification
- `src/pages/Settings.tsx` : Page de paramètres avec la section "Mon espace organisateur"

## 📞 Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs dans la console du navigateur
2. Vérifiez les logs dans Supabase Dashboard > Logs
3. Exécutez le script de vérification SQL pour diagnostiquer
