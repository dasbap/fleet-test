# Vérification de votre membership de flotte

## 📋 Interprétation des résultats

Après avoir exécuté la requête SQL, vous devriez voir des résultats comme :

```
role      | is_active | fleet_name | fleet_id
----------|-----------|------------|----------------------------------
manager   | true      | Ma Flotte  | 550e8400-e29b-41d4-a716-446655440000
```

### ✅ Résultats attendus

**Si vous voyez des résultats** :
- ✅ Vous êtes membre d'une flotte
- ✅ Vérifiez que `role` est `manager` ou `organizer`
- ✅ Vérifiez que `is_active` est `true`
- ✅ Notez le `fleet_id` (vous en aurez besoin)

**Si vous ne voyez AUCUN résultat** :
- ❌ Vous n'êtes pas membre d'une flotte active
- ❌ Vous devez créer une flotte ou être invité

## 🔧 Solutions selon les résultats

### Cas 1 : Vous avez un membership mais le rôle est "driver"

**Problème** : Seuls les managers et organizers peuvent créer des invitations.

**Solution** : Demandez à un organizer de changer votre rôle :

```sql
-- Un organizer doit exécuter cette requête pour vous
UPDATE fleet_memberships
SET role = 'manager'
WHERE user_id = 'VOTRE_USER_ID'
  AND fleet_id = 'VOTRE_FLEET_ID';
```

### Cas 2 : Vous n'avez pas de membership

**Solution 1 : Créer une organisation et une flotte**

```sql
-- 1. Créer une organisation
INSERT INTO orgs (name, country_code)
VALUES ('Mon Organisation', 'CM')
RETURNING id;

-- 2. Créer une flotte (remplacez ORG_ID par l'ID obtenu ci-dessus)
INSERT INTO fleets (org_id, name)
VALUES ('ORG_ID_ICI', 'Ma Flotte')
RETURNING id;

-- 3. Créer votre membership en tant qu'organizer
INSERT INTO fleet_memberships (fleet_id, user_id, role, is_active)
VALUES (
  'FLEET_ID_ICI',  -- Remplacez par l'ID de la flotte créée
  auth.uid(),
  'organizer',
  true
);
```

**Solution 2 : Utiliser une invitation existante**

Si quelqu'un vous a donné un code d'invitation :
1. Allez sur http://localhost:8080?mode=signup
2. Entrez le code d'invitation
3. Créez votre compte
4. Vous serez automatiquement ajouté à la flotte

### Cas 3 : Vous avez un membership mais `is_active = false`

**Solution** : Réactiver votre membership

```sql
UPDATE fleet_memberships
SET is_active = true
WHERE user_id = auth.uid()
  AND fleet_id = 'VOTRE_FLEET_ID';
```

## 🎯 Vérification dans l'application

Après avoir vérifié/corrigé votre membership :

1. **Rechargez l'application** (F5)
2. **Vérifiez dans la console** (F12) :
   ```javascript
   // Dans la console du navigateur
   // Vous devriez voir votre userFleetId
   ```

3. **Testez le bouton** "Créer une invitation"
   - Le dialog devrait maintenant s'ouvrir
   - Si `userFleetId` est null, vous verrez un message d'erreur dans le dialog

## 🔍 Debug dans l'application

Ouvrez la console du navigateur (F12) et vérifiez :

```javascript
// Vérifier les données d'authentification
localStorage.getItem('sb-zqxjvmejoktwlcqshnwi-auth-token')
```

Ou dans l'onglet **Application** → **Local Storage**, cherchez les clés Supabase.

## 📝 Requêtes SQL utiles

### Voir tous vos membreships (actifs et inactifs)

```sql
SELECT 
  fm.role,
  fm.is_active,
  f.name as fleet_name,
  f.id as fleet_id,
  fm.created_at
FROM fleet_memberships fm
JOIN fleets f ON f.id = fm.fleet_id
WHERE fm.user_id = auth.uid()
ORDER BY fm.created_at DESC;
```

### Voir votre user_id actuel

```sql
SELECT auth.uid() as current_user_id;
```

### Créer un membership organizer pour vous-même (si vous êtes admin)

```sql
-- ATTENTION : Cette requête nécessite des permissions élevées
-- Utilisez-la uniquement si vous avez accès au service_role

-- D'abord, obtenez votre user_id
SELECT id, email FROM auth.users WHERE email = 'votre@email.com';

-- Ensuite, créez la flotte et le membership
-- (voir Solution 2 ci-dessus)
```

---

**Une fois que vous avez un membership actif avec le rôle manager ou organizer, le bouton "Créer une invitation" devrait fonctionner !** ✅
