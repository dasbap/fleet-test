# Comment utiliser la page Invitations avec Supabase

## 📋 Prérequis

### 1. Vérifier que le schéma est exécuté

Assurez-vous d'avoir exécuté le schéma SQL dans Supabase :

1. Allez dans **Supabase Dashboard** → **SQL Editor**
2. Vérifiez que la table `fleet_invitations` existe :

```sql
-- Vérifier que la table existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'fleet_invitations';
```

Si la table n'existe pas, exécutez `supabase/schema.sql` dans Supabase SQL Editor.

### 2. Vérifier les politiques RLS

Les politiques RLS doivent être configurées pour permettre :
- **Lecture** : Tous les utilisateurs (pour valider les codes lors de l'inscription)
- **Écriture** : Seulement les managers et organizers
- **Mise à jour** : Seulement les managers et organizers
- **Suppression** : Seulement les managers et organizers

Vérifiez dans Supabase Dashboard → **Authentication** → **Policies** que les politiques suivantes existent :

```sql
-- Vérifier les politiques RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'fleet_invitations';
```

Vous devriez voir :
- `invitations_public_read` (SELECT pour anon, authenticated)
- `invitations_write_manager_org` (INSERT pour managers/organizers)
- `invitations_update_manager_org` (UPDATE pour managers/organizers)

### 3. Vérifier que vous avez une flotte

Pour créer des invitations, vous devez être membre d'une flotte avec le rôle `manager` ou `organizer`.

Vérifiez votre membership :

```sql
-- Voir vos membreships
SELECT 
  fm.id,
  fm.role,
  fm.is_active,
  f.name as fleet_name,
  f.id as fleet_id
FROM fleet_memberships fm
JOIN fleets f ON f.id = fm.fleet_id
WHERE fm.user_id = auth.uid()
  AND fm.is_active = true;
```

---

## 🚀 Utilisation de la page Invitations

### Étape 1 : Accéder à la page

1. Connectez-vous à l'application : http://localhost:8080
2. Assurez-vous d'être connecté en tant qu'**organizer** ou **manager**
3. Dans la sidebar, cliquez sur **"Invitations"** (icône ticket 🎫)
4. Ou allez directement sur : http://localhost:8080/dashboard/invitations

### Étape 2 : Créer une invitation

1. Cliquez sur le bouton **"Créer une invitation"** en haut à droite
2. Le dialog `CreateInvitationDialog` s'ouvre
3. Remplissez le formulaire :
   - **Code** : Généré automatiquement (ex: `INV-A3B7K9`) ou personnalisez-le
   - **Expiration** (optionnel) : Cochez et définissez le nombre de jours
   - **Limite d'utilisation** (optionnel) : Cochez et définissez le maximum
4. Cliquez sur **"Créer l'invitation"**
5. Le code est affiché avec un bouton de copie

### Étape 3 : Gérer les invitations

#### Voir toutes les invitations

La page affiche automatiquement toutes les invitations de votre flotte avec :
- Le code d'invitation
- Le statut (Active, Expirée, Limite atteinte)
- Le nombre d'utilisations (ex: `3 / 5`)
- La date d'expiration
- La date de création

#### Copier un code

1. Cliquez sur l'icône **Copier** à côté du code
2. Le code est copié dans le presse-papiers
3. Partagez-le avec les personnes à inviter

#### Supprimer une invitation

1. Cliquez sur les **trois points** (⋮) à droite de l'invitation
2. Sélectionnez **"Supprimer"**
3. Confirmez la suppression

---

## 🧪 Tester avec la base de données

### Test 1 : Vérifier que les invitations sont créées

Dans Supabase SQL Editor, exécutez :

```sql
-- Voir toutes les invitations de votre flotte
SELECT 
  fi.id,
  fi.code,
  fi.expires_at,
  fi.max_uses,
  fi.current_uses,
  fi.created_at,
  f.name as fleet_name
FROM fleet_invitations fi
JOIN fleets f ON f.id = fi.fleet_id
WHERE fi.fleet_id IN (
  SELECT fleet_id 
  FROM fleet_memberships 
  WHERE user_id = auth.uid() 
    AND is_active = true
)
ORDER BY fi.created_at DESC;
```

### Test 2 : Vérifier les permissions

Testez que seuls les managers/organizers peuvent créer :

```sql
-- Vérifier vos permissions
SELECT 
  fm.role,
  f.name as fleet_name,
  CASE 
    WHEN fm.role IN ('manager', 'organizer') THEN 'Vous pouvez créer des invitations'
    ELSE 'Vous ne pouvez pas créer d''invitations'
  END as permission_status
FROM fleet_memberships fm
JOIN fleets f ON f.id = fm.fleet_id
WHERE fm.user_id = auth.uid()
  AND fm.is_active = true;
```

### Test 3 : Tester la création via SQL (pour comparaison)

Créez une invitation directement en SQL pour comparer :

```sql
-- Créer une invitation de test
INSERT INTO fleet_invitations (
  fleet_id,
  code,
  expires_at,
  max_uses,
  created_by
)
SELECT 
  fm.fleet_id,
  'TEST-SQL-' || substr(md5(random()::text), 1, 6),
  NOW() + INTERVAL '30 days',
  10,
  auth.uid()
FROM fleet_memberships fm
WHERE fm.user_id = auth.uid()
  AND fm.role IN ('manager', 'organizer')
  AND fm.is_active = true
LIMIT 1
RETURNING *;
```

Puis vérifiez qu'elle apparaît dans la page Invitations.

### Test 4 : Tester l'utilisation d'une invitation

1. Créez une invitation via la page
2. Copiez le code
3. Ouvrez une fenêtre de navigation privée
4. Allez sur http://localhost:8080?mode=signup
5. Entrez le code d'invitation
6. Complétez l'inscription
7. Vérifiez que `current_uses` a été incrémenté :

```sql
-- Vérifier l'utilisation
SELECT 
  code,
  current_uses,
  max_uses,
  CASE 
    WHEN max_uses IS NOT NULL AND current_uses >= max_uses THEN 'Limite atteinte'
    WHEN expires_at IS NOT NULL AND expires_at < NOW() THEN 'Expirée'
    ELSE 'Active'
  END as status
FROM fleet_invitations
WHERE code = 'VOTRE_CODE_ICI';
```

---

## 🔍 Dépannage

### Problème : "Vous n'avez pas les permissions"

**Cause** : Vous n'êtes pas manager ou organizer pour cette flotte.

**Solution** :
1. Vérifiez votre rôle dans Supabase :

```sql
SELECT role, is_active 
FROM fleet_memberships 
WHERE user_id = auth.uid() 
  AND is_active = true;
```

2. Si vous n'avez pas le bon rôle, demandez à un organizer de vous promouvoir.

### Problème : "Aucune invitation affichée"

**Causes possibles** :
1. Aucune invitation n'a été créée pour votre flotte
2. Le `userFleetId` n'est pas correctement récupéré

**Solution** :
1. Vérifiez votre `userFleetId` dans la console du navigateur (F12)
2. Vérifiez que vous avez bien une flotte active :

```sql
SELECT f.id, f.name 
FROM fleets f
JOIN fleet_memberships fm ON fm.fleet_id = f.id
WHERE fm.user_id = auth.uid()
  AND fm.is_active = true;
```

### Problème : "Erreur lors de la création"

**Causes possibles** :
1. Code déjà utilisé (violation de contrainte unique)
2. Problème de permissions RLS
3. `fleet_id` manquant

**Solution** :
1. Vérifiez les logs dans la console du navigateur (F12)
2. Vérifiez que le code est unique :

```sql
SELECT code 
FROM fleet_invitations 
WHERE code = 'VOTRE_CODE';
```

3. Vérifiez les politiques RLS dans Supabase Dashboard

### Problème : Les invitations ne se rafraîchissent pas

**Solution** :
1. Rechargez la page (F5)
2. Vérifiez que React Query invalide bien les queries après création

---

## 📊 Requêtes SQL utiles

### Voir toutes les invitations avec détails

```sql
SELECT 
  fi.code,
  fi.current_uses,
  fi.max_uses,
  fi.expires_at,
  CASE 
    WHEN fi.max_uses IS NOT NULL AND fi.current_uses >= fi.max_uses THEN 'Limite atteinte'
    WHEN fi.expires_at IS NOT NULL AND fi.expires_at < NOW() THEN 'Expirée'
    ELSE 'Active'
  END as status,
  f.name as fleet_name,
  p.full_name as created_by_name,
  fi.created_at
FROM fleet_invitations fi
JOIN fleets f ON f.id = fi.fleet_id
LEFT JOIN profiles p ON p.user_id = fi.created_by
WHERE fi.fleet_id IN (
  SELECT fleet_id 
  FROM fleet_memberships 
  WHERE user_id = auth.uid() 
    AND is_active = true
)
ORDER BY fi.created_at DESC;
```

### Statistiques des invitations

```sql
SELECT 
  COUNT(*) as total_invitations,
  COUNT(*) FILTER (WHERE expires_at IS NULL OR expires_at > NOW()) as active_invitations,
  COUNT(*) FILTER (WHERE expires_at IS NOT NULL AND expires_at <= NOW()) as expired_invitations,
  COUNT(*) FILTER (WHERE max_uses IS NOT NULL AND current_uses >= max_uses) as limit_reached,
  SUM(current_uses) as total_uses
FROM fleet_invitations
WHERE fleet_id IN (
  SELECT fleet_id 
  FROM fleet_memberships 
  WHERE user_id = auth.uid() 
    AND is_active = true
);
```

### Supprimer les invitations expirées

```sql
-- Supprimer toutes les invitations expirées de votre flotte
DELETE FROM fleet_invitations
WHERE fleet_id IN (
  SELECT fleet_id 
  FROM fleet_memberships 
  WHERE user_id = auth.uid() 
    AND is_active = true
)
AND expires_at IS NOT NULL
AND expires_at < NOW();
```

---

## ✅ Checklist de vérification

- [ ] Le schéma SQL a été exécuté dans Supabase
- [ ] Les politiques RLS sont configurées
- [ ] Vous êtes connecté en tant que manager ou organizer
- [ ] Vous avez une flotte active
- [ ] La page `/dashboard/invitations` est accessible
- [ ] Vous pouvez créer une invitation
- [ ] Les invitations apparaissent dans la liste
- [ ] Vous pouvez copier les codes
- [ ] Vous pouvez supprimer des invitations
- [ ] Les statistiques s'affichent correctement

---

## 🎯 Prochaines étapes

Une fois que tout fonctionne :

1. **Créer des invitations** pour inviter des chauffeurs
2. **Partager les codes** avec les personnes à inviter
3. **Surveiller les utilisations** pour voir qui a rejoint
4. **Nettoyer régulièrement** les invitations expirées

---

**La page est maintenant prête à être utilisée avec votre base de données Supabase !** 🚀
