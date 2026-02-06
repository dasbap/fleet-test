# Guide de déploiement de la fonction RPC check_esamba_2024

## 📋 Vue d'ensemble

Ce guide vous explique comment déployer la fonction RPC `check_esamba_2024()` dans Supabase et tester la vérification des données ESAMBA.

## 🚀 Déploiement

### Option 1 : Déploiement manuel (Recommandé)

1. **Ouvrez Supabase Dashboard**
   - Allez sur https://app.supabase.com
   - Connectez-vous à votre compte
   - Sélectionnez votre projet

2. **Accédez au SQL Editor**
   - Dans le menu de gauche, cliquez sur **SQL Editor**
   - Cliquez sur **New query** pour créer une nouvelle requête

3. **Copiez le contenu du fichier SQL**
   - Ouvrez le fichier : `supabase/rpc-check-esamba-2024.sql`
   - Copiez **tout le contenu** du fichier

4. **Collez dans l'éditeur SQL**
   - Collez le contenu dans la zone de texte de Supabase SQL Editor

5. **Exécutez le script**
   - Cliquez sur le bouton **Run** (ou appuyez sur `Ctrl+Enter`)
   - Vous devriez voir : **"Success. No rows returned"**

6. **Vérifiez que la fonction est créée**
   - Exécutez cette requête pour lister les fonctions :
   ```sql
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_schema = 'public' 
     AND routine_name = 'check_esamba_2024';
   ```
   - Vous devriez voir `check_esamba_2024` dans les résultats

### Option 2 : Déploiement avec Supabase CLI (Si disponible)

Si vous avez Supabase CLI installé et configuré :

```bash
# Exécuter le script de déploiement
powershell -ExecutionPolicy Bypass -File scripts/deploy-check-esamba-rpc.ps1
```

Ou directement :

```bash
supabase db execute --file supabase/rpc-check-esamba-2024.sql
```

## ✅ Test de la fonction RPC

### Test dans Supabase SQL Editor

1. Dans **SQL Editor**, exécutez cette requête :

```sql
SELECT * FROM check_esamba_2024();
```

2. **Résultat attendu** :
   - Une ligne avec 5 colonnes booléennes :
     - `organisation` : `true` ou `false`
     - `flotte` : `true` ou `false`
     - `membership_organizer` : `true` ou `false`
     - `vehicule_esamba_001` : `true` ou `false`
     - `invitation_esamba_2024` : `true` ou `false`

3. **Interprétation** :
   - Si toutes les valeurs sont `true` → ✅ Toutes les données ESAMBA sont présentes
   - Si certaines valeurs sont `false` → ⚠️ Certaines données manquent

### Test depuis l'application

1. **Lancez l'application** :
   ```bash
   npm run dev
   ```

2. **Allez sur la page Paramètres** :
   - Ouvrez http://localhost:8080/settings
   - Connectez-vous si nécessaire

3. **Vérifiez la section "Vérification des données"** :
   - Vous devriez voir le statut de chaque élément
   - Cliquez sur **"Actualiser"** pour rafraîchir la vérification

4. **Si des données manquent** :
   - Cliquez sur **"Créer les données ESAMBA-2024"**
   - Attendez la confirmation
   - Cliquez à nouveau sur **"Actualiser"**

## 🔍 Vérification manuelle des données

Si vous voulez vérifier manuellement chaque élément :

```sql
-- 1. Vérifier l'organisation
SELECT COUNT(*) as count 
FROM orgs 
WHERE name = 'Organisation ESAMBA';

-- 2. Vérifier la flotte
SELECT COUNT(*) as count 
FROM fleets 
WHERE name = 'Flotte ESAMBA';

-- 3. Vérifier le membership organizer
SELECT COUNT(*) as count 
FROM fleet_memberships fm
JOIN fleets f ON f.id = fm.fleet_id
WHERE f.name = 'Flotte ESAMBA' 
  AND fm.role = 'organizer' 
  AND fm.is_active = true;

-- 4. Vérifier le véhicule
SELECT COUNT(*) as count 
FROM vehicles v
JOIN fleets f ON f.id = v.fleet_id
WHERE f.name = 'Flotte ESAMBA' 
  AND v.registration = 'ESAMBA-001';

-- 5. Vérifier l'invitation
SELECT COUNT(*) as count 
FROM fleet_invitations fi
JOIN fleets f ON f.id = fi.fleet_id
WHERE f.name = 'Flotte ESAMBA' 
  AND fi.code = 'ESAMBA-2024';
```

Chaque requête devrait retourner `count = 1` si l'élément existe.

## 🛠️ Scripts disponibles

- **`scripts/deploy-check-esamba-rpc.ps1`** : Script de déploiement automatisé
- **`scripts/test-check-esamba-rpc.ps1`** : Script de test avec instructions
- **`scripts/test-esamba-verification.ps1`** : Script de test complet

## 📝 Notes importantes

1. **Permissions** : La fonction est créée avec `SECURITY DEFINER` et les permissions sont accordées aux utilisateurs `authenticated`

2. **Contexte utilisateur** : La vérification du membership utilise `auth.uid()`, donc elle vérifie le membership de l'utilisateur actuellement connecté

3. **Données de test** : Si vous créez les données ESAMBA depuis l'application, assurez-vous d'être connecté avec le compte qui doit avoir le membership organizer

## ❓ Dépannage

### La fonction n'existe pas après le déploiement

1. Vérifiez qu'il n'y a pas d'erreurs dans le SQL Editor
2. Vérifiez les permissions de votre utilisateur Supabase
3. Essayez de recréer la fonction en exécutant à nouveau le script SQL

### La fonction retourne des erreurs

1. Vérifiez que toutes les tables existent (`orgs`, `fleets`, `fleet_memberships`, `vehicles`, `fleet_invitations`)
2. Vérifiez que vous êtes connecté (pour `auth.uid()`)
3. Vérifiez les permissions sur les tables

### Les données ne sont pas détectées

1. Vérifiez que les noms correspondent exactement :
   - Organisation : `Organisation ESAMBA`
   - Flotte : `Flotte ESAMBA`
   - Véhicule : `ESAMBA-001`
   - Invitation : `ESAMBA-2024`
2. Vérifiez que vous êtes connecté avec le bon compte utilisateur
3. Vérifiez que le membership est actif (`is_active = true`)

## ✅ Checklist de déploiement

- [ ] Fichier SQL `supabase/rpc-check-esamba-2024.sql` copié dans Supabase SQL Editor
- [ ] Script exécuté avec succès (message "Success. No rows returned")
- [ ] Fonction `check_esamba_2024` visible dans `information_schema.routines`
- [ ] Test de la fonction RPC réussi : `SELECT * FROM check_esamba_2024();`
- [ ] Vérification dans l'application fonctionne (page /settings)
- [ ] Toutes les données ESAMBA créées et vérifiées

## 🎯 Prochaines étapes

Une fois la fonction déployée et testée :

1. Créez les données ESAMBA depuis l'application si elles n'existent pas
2. Vérifiez que tous les éléments sont marqués "Créée" dans l'interface
3. Testez l'utilisation de l'invitation `ESAMBA-2024` pour ajouter des utilisateurs à la flotte
