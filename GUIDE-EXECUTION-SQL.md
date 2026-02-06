# 📘 Guide d'Exécution des Scripts SQL

## ⚠️ Erreur Courante : `syntax error at or near "#"`

Cette erreur se produit lorsque vous copiez du code PowerShell (avec des commentaires `#`) dans Supabase SQL Editor.

## ✅ Solution

### Règle d'Or
**Ne copiez JAMAIS les lignes qui commencent par `#` dans Supabase SQL Editor.**

PostgreSQL utilise `--` pour les commentaires, pas `#`.

### Comment Copier Correctement

#### ✅ BON - Copier uniquement le SQL
```sql
-- Vérifier l'organisation et la flotte
SELECT 
  o.name as organisation,
  f.name as flotte
FROM organisations o
JOIN flottes f ON f.org_id = o.id;
```

#### ❌ MAUVAIS - Copier avec des commentaires PowerShell
```sql
# =====================================================  ← NE PAS COPIER CETTE LIGNE !
# Script de Test
SELECT ...
```

## 📋 Instructions Pas à Pas

### Méthode 1 : Utiliser les Fichiers SQL Directement

1. **Ouvrez le fichier SQL** (ex: `supabase/verify-test-account.sql`)
2. **Sélectionnez tout** (Ctrl+A)
3. **Copiez** (Ctrl+C)
4. **Collez dans Supabase SQL Editor** (Ctrl+V)
5. **Exécutez** (Run ou F5)

✅ **Ces fichiers sont déjà corrects** - ils utilisent `--` pour les commentaires.

### Méthode 2 : Copier depuis un Script PowerShell

Si vous copiez des requêtes SQL depuis un script PowerShell (ex: `scripts/test-test-account.ps1`) :

1. **Identifiez les requêtes SQL** - Elles sont entre `@"` et `"@`
2. **Copiez uniquement le contenu SQL** - Ignorez les lignes avec `#`
3. **Vérifiez que les commentaires commencent par `--`** et non `#`

### Exemple de Requête SQL Correcte

```sql
-- Vérifier l'organisation et la flotte
SELECT 
  o.name as organisation,
  f.name as flotte,
  f.collection_policy,
  COUNT(DISTINCT fm.id) FILTER (WHERE fm.is_active = true) as membres_actifs
FROM organisations o
JOIN flottes f ON f.org_id = o.id
LEFT JOIN flotte_adhesions fm ON fm.fleet_id = f.id
WHERE o.name = 'Test Organisation'
GROUP BY o.id, o.name, f.id, f.name, f.collection_policy;
```

## 🔍 Vérification Avant Exécution

Avant d'exécuter dans Supabase SQL Editor, vérifiez que :

1. ✅ Aucune ligne ne commence par `#`
2. ✅ Les commentaires utilisent `--` (double tiret)
3. ✅ Le fichier se termine par `.sql` (pas `.ps1`)
4. ✅ Les noms de tables sont corrects :
   - `organisations` (pas `orgs`)
   - `flottes` (pas `fleets`)
   - `flotte_adhesions` (pas `fleet_memberships`)
   - `profils` (pas `profiles`)

## 📁 Fichiers SQL Prêts à l'Emploi

Ces fichiers peuvent être exécutés directement dans Supabase SQL Editor :

- ✅ `supabase/verify-test-account.sql`
- ✅ `supabase/create-test-account-complete.sql`
- ✅ `supabase/schema.sql`
- ✅ Tous les fichiers dans `supabase/migrations/`

## 🚫 Fichiers à NE PAS Exécuter Directement

Ces fichiers sont des scripts PowerShell, pas des fichiers SQL :

- ❌ `scripts/*.ps1` (scripts PowerShell)
- ❌ `*.md` (documentation Markdown)

## 💡 Astuce

Si vous n'êtes pas sûr, ouvrez le fichier dans un éditeur de texte et vérifiez :
- Les fichiers SQL commencent généralement par `--` ou `BEGIN;`
- Les scripts PowerShell commencent généralement par `#` ou `Write-Host`

## 🆘 En Cas d'Erreur

Si vous voyez toujours l'erreur `syntax error at or near "#"` :

1. **Vérifiez la première ligne** de votre requête SQL
2. **Supprimez toutes les lignes** qui commencent par `#`
3. **Remplacez les commentaires `#`** par `--` si nécessaire
4. **Réessayez**

## 📞 Exemple de Correction

### Avant (❌ Erreur)
```sql
# Script de vérification
SELECT * FROM organisations;
```

### Après (✅ Correct)
```sql
-- Script de vérification
SELECT * FROM organisations;
```
