# Guide de Correction des Types Enum

## 📋 Résumé

Ce guide explique comment vérifier et corriger les types enum (`role_type`, `vehicle_status`, `closure_status`) dans votre base de données Supabase de manière idempotente.

## 🔍 Problème Identifié

Le schéma actuel utilise `CREATE TYPE` sans vérification préalable, ce qui peut échouer si les types existent déjà.

## ✅ Solution Implémentée

### 1. Script de Vérification (`verify-and-fix-enums.sql`)
- Vérifie l'existence des types enum
- Affiche les valeurs actuelles de chaque type
- Détecte les valeurs manquantes
- Génère un rapport de l'état actuel

### 2. Script de Correction Idempotent (`fix-enums-idempotent.sql`)
- Crée les types enum uniquement s'ils n'existent pas
- Ajoute les valeurs manquantes de manière sûre
- Compatible avec PostgreSQL 9.1+ et 10+
- Gère les erreurs gracieusement

### 3. Schema.sql Mis à Jour
- Utilise maintenant des blocs `DO $$` idempotents
- Peut être exécuté plusieurs fois sans erreur

## 🚀 Instructions d'Exécution

### Option 1: Via Supabase Dashboard (Recommandé)

1. Ouvrez votre projet Supabase
2. Allez dans **SQL Editor**
3. Copiez le contenu de `supabase/fix-enums-idempotent.sql`
4. Collez et exécutez le script
5. Vérifiez les messages `NOTICE` pour confirmer les actions

### Option 2: Via PowerShell

```powershell
.\scripts\fix-enums.ps1
```

### Option 3: Via Supabase CLI

```bash
supabase db execute -f supabase/fix-enums-idempotent.sql
```

## 📊 Valeurs Attendues

### `role_type`
- `organizer`
- `manager`
- `driver`
- `mechanic`

### `vehicle_status`
- `ok`
- `blocked`

### `closure_status`
- `pending`
- `validated`
- `rejected`

## ⚠️ Recommandations

### Si les types n'existent pas encore
✅ **Utiliser le script idempotent** - Crée les types avec toutes les valeurs

### Si les types existent mais manquent des valeurs
✅ **ALTER TYPE ADD VALUE** (recommandé si le type est utilisé en production)
- Le script détecte et ajoute automatiquement les valeurs manquantes
- Ne nécessite pas de recréer les tables

### Si vous devez recréer les types (DÉCONSEILLÉ en production)
❌ **DROP TYPE CASCADE** - Supprime toutes les dépendances
- Nécessite de recréer toutes les colonnes utilisant ces types
- Risque de perte de données si mal exécuté

## 🔒 Sécurité

- ✅ Script idempotent : peut être exécuté plusieurs fois
- ✅ Vérifications préalables avant modification
- ✅ Gestion d'erreurs gracieuse
- ✅ Pas de suppression de données

## 📝 Notes Techniques

### Limitations PostgreSQL

1. **ALTER TYPE ADD VALUE** ne peut pas être dans une transaction
   - Le script gère cela avec des blocs `DO` séparés

2. **IF NOT EXISTS** pour ADD VALUE nécessite PostgreSQL 10+
   - Le script vérifie manuellement pour les versions antérieures

3. **Ordre des valeurs enum**
   - L'ordre est important pour `enumsortorder`
   - Les nouvelles valeurs sont ajoutées à la fin

## ✅ Vérification Post-Exécution

Après exécution, vérifiez avec :

```sql
SELECT 
  t.typname as type_name,
  string_agg(e.enumlabel, ', ' order by e.enumsortorder) as valeurs,
  count(e.enumlabel) as nombre_valeurs
FROM pg_type t
JOIN pg_enum e ON e.enumtypid = t.oid
WHERE t.typname IN ('role_type', 'vehicle_status', 'closure_status')
GROUP BY t.typname
ORDER BY t.typname;
```

## 🎯 Prochaines Étapes

1. ✅ Exécuter `fix-enums-idempotent.sql`
2. ✅ Vérifier le rapport final
3. ✅ Tester les fonctionnalités utilisant ces enums
4. ✅ Mettre à jour le schéma si nécessaire
