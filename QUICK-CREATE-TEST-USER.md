# 🚀 Guide Rapide : Création de l'Utilisateur Test

## ⚡ Solution Rapide (Recommandée)

Pour créer automatiquement l'utilisateur `utilisateur_test@example.com` :

### Option 1 : Script PowerShell Automatique (Recommandé)

```powershell
# Exécutez dans PowerShell depuis la racine du projet
.\scripts\create-test-user-complete.ps1
```

Le script va :
1. ✅ Créer l'utilisateur dans Supabase Auth via l'API Admin
2. ✅ Vous guider pour exécuter le script SQL d'intégration
3. ✅ Intégrer l'utilisateur à l'organisation et la flotte

**Prérequis :**
- Avoir votre **Service Role Key** de Supabase
  - Trouvable dans : https://app.supabase.com → Votre projet → Settings → API → `service_role` (secret)
- Avoir votre **URL Supabase** (ex: `https://xxxxx.supabase.co`)

**Le script vous demandera ces informations si elles ne sont pas dans `.env.local`**

### Option 2 : Via l'Interface Supabase (Manuel)

1. Allez sur https://app.supabase.com
2. Sélectionnez votre projet
3. Allez dans **Authentication** > **Users**
4. Cliquez sur **"Add user"**
5. Remplissez :
   - **Email** : `utilisateur_test@example.com`
   - **Password** : `Test1234!@#$` (ou un mot de passe sécurisé)
   - **Auto Confirm User** : ✅ Cochez cette case
6. Cliquez sur **"Create user"**
7. Exécutez ensuite le script SQL : `supabase/create-test-user-complete.sql`

---

## 📋 Informations de l'Utilisateur Test

- **Email** : `utilisateur_test@example.com`
- **Mot de passe** : `Test1234!@#$` (si créé via le script PowerShell)
- **Rôle** : `organizer` (administrateur de la flotte)
- **Organisation** : "Test Organisation"
- **Flotte** : "Flotte Test"

---

## 🔍 Vérification

Après la création, vérifiez avec :

```sql
-- Dans Supabase SQL Editor
-- Exécutez : supabase/verify-test-user.sql
```

Ou manuellement :

```sql
SELECT 
  u.email,
  p.full_name,
  o.name as organisation,
  f.name as flotte,
  fm.role,
  fm.is_active
FROM auth.users u
LEFT JOIN profils p ON p.user_id = u.id
LEFT JOIN flotte_adhesions fm ON fm.user_id = u.id
LEFT JOIN flottes f ON f.id = fm.fleet_id
LEFT JOIN organisations o ON o.id = f.org_id
WHERE u.email = 'utilisateur_test@example.com';
```

---

## 🆘 Dépannage

### Erreur : "Utilisateur non trouvé"

**Solution :**
1. Utilisez le script PowerShell : `.\scripts\create-test-user-complete.ps1`
2. Ou créez l'utilisateur manuellement via l'interface Supabase (voir Option 2 ci-dessus)
3. Réexécutez ensuite le script SQL

### Erreur : "Service Role Key invalide"

**Solution :**
1. Vérifiez que vous utilisez la **Service Role Key** (pas l'anon key)
2. Trouvez-la dans : Settings → API → `service_role` (secret)
3. Assurez-vous de copier la clé complète

### Erreur : "Organisation non trouvée"

**Solution :**
1. Exécutez d'abord : `supabase/create-test-account-complete.sql`
2. Ce script crée l'organisation et la flotte nécessaires

---

## 📚 Documentation Complète

Pour plus de détails, consultez :
- **Guide complet** : `GUIDE-CREATION-UTILISATEUR-TEST.md`
- **Script SQL** : `supabase/create-test-user-complete.sql`
- **Script PowerShell** : `scripts/create-test-user-complete.ps1`

---

**Date de création** : 2025-02-05
