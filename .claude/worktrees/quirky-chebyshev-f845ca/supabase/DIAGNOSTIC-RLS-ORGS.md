# 🔍 Diagnostic et Réparation RLS - Table ORGS

## ❌ Problème identifié

**Erreur** : `new row violates row-level security policy for table "orgs"`

**Cause** : La table `orgs` a RLS activé mais **aucune politique** n'autorise l'insertion de nouvelles lignes par les utilisateurs authentifiés.

## ✅ Solution

Le script `fix-orgs-rls-policies.sql` crée les politiques RLS nécessaires pour :

1. **ORGS** (Organisations)
   - ✅ SELECT : Lecture pour tous les utilisateurs authentifiés
   - ✅ INSERT : Création pour tous les utilisateurs authentifiés
   - ✅ UPDATE : Modification pour tous les utilisateurs authentifiés
   - ✅ DELETE : Suppression pour tous les utilisateurs authentifiés

2. **FLEETS** (Flottes)
   - ✅ SELECT : Lecture pour tous les utilisateurs authentifiés
   - ✅ INSERT : Création pour tous les utilisateurs authentifiés
   - ✅ UPDATE : Modification pour tous les utilisateurs authentifiés
   - ✅ DELETE : Suppression pour tous les utilisateurs authentifiés

## 📋 Instructions d'exécution

1. Ouvrez le **Supabase �diteur SQL**
2. Copiez-collez le contenu de `supabase/fix-orgs-rls-policies.sql`
3. Exécutez le script
4. Vérifiez que les politiques ont été créées (dernière requête SELECT du script)

## 🔒 Sécurité

**Note importante** : Les politiques créées sont **permissives** pour permettre le fonctionnement de la fonctionnalité de seed ESAMBA. 

Pour une sécurité renforcée en production, vous pouvez :
- Restreindre la création aux organisateurs uniquement
- Restreindre la modification/suppression aux propriétaires
- Ajouter des vérifications basées sur les membreships

## 🧪 Test

Après exécution du script, testez la création des données ESAMBA depuis la page Paramètres :
- Le bouton "Créer les données ESAMBA-2024" devrait fonctionner sans erreur RLS
