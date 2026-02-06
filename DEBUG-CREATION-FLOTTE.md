# 🐛 Débogage - Problème de Flotte Non Visible

## 🔍 Problème Identifié

Après la création d'une flotte, celle-ci n'est pas visible dans l'application. Le `userFleetId` reste `null`.

## 🔧 Corrections Apportées

### 1. Forcer le Rechargement de Page

**Fichier modifié :** `src/pages/CreateFleet.tsx`

- ✅ Utilisation de `window.location.href = "/dashboard"` au lieu de `navigate("/dashboard")`
- ✅ Cela force un rechargement complet de la page et réinitialise tous les hooks
- ✅ Vérification que le membership existe avant redirection

### 2. Logs de Débogage Améliorés

**Fichiers modifiés :**
- `src/hooks/useAuth.ts` - Logs détaillés dans `fetchMemberships`
- `src/pages/CreateFleet.tsx` - Logs à chaque étape de création

## 🧪 Test de Vérification

### Étape 1 : Vérifier la Création

1. **Ouvrez la console** (F12)
2. **Allez sur** `/dashboard/create-fleet`
3. **Créez une flotte**
4. **Dans la console, vous devriez voir :**
   ```
   ✅ Flotte créée avec succès, données: { orgId: '...', fleetId: '...' }
   Tentative de rafraîchissement des memberships...
   🔄 Récupération des memberships pour l'utilisateur: ...
   📋 Memberships récupérés: [...]
   ✅ Memberships mis à jour: { count: 1, role: 'organizer', fleetIds: [...] }
   ✅ Membership trouvé, redirection vers dashboard
   ```

### Étape 2 : Vérifier dans Supabase

Exécutez cette requête dans Supabase SQL Editor :

```sql
-- Vérifier que le membership a été créé
SELECT 
  fm.id,
  fm.fleet_id,
  fm.user_id,
  fm.role,
  fm.is_active,
  f.name as fleet_name,
  u.email
FROM fleet_memberships fm
JOIN fleets f ON f.id = fm.fleet_id
LEFT JOIN auth.users u ON u.id = fm.user_id
WHERE fm.user_id = auth.uid()
  AND fm.is_active = true
ORDER BY fm.created_at DESC;
```

### Étape 3 : Vérifier dans la Console du Navigateur

Après le rechargement de la page, dans la console :

```javascript
// Vérifier votre état d'authentification
const { data: user } = await supabase.auth.getUser();
console.log("User ID:", user.user.id);

// Vérifier vos memberships
const { data: memberships } = await supabase
  .from('fleet_memberships')
  .select('*')
  .eq('user_id', user.user.id)
  .eq('is_active', true);
console.log("Memberships:", memberships);
```

## 🔍 Diagnostic

### Si la flotte n'est toujours pas visible :

1. **Vérifiez que le membership existe dans Supabase**
   - Exécutez la requête SQL ci-dessus
   - Si aucun résultat, le membership n'a pas été créé

2. **Vérifiez les logs dans la console**
   - Recherchez les erreurs en rouge
   - Vérifiez les messages de log

3. **Vérifiez les permissions RLS**
   - Les politiques RLS doivent permettre la lecture des memberships
   - Vérifiez que `memberships_read_self` existe

4. **Vérifiez que les fonctions RPC sont déployées**
   ```sql
   SELECT proname FROM pg_proc 
   WHERE proname IN ('upsert_fleet_membership', 'create_esamba_fleet');
   ```

## ✅ Solution de Contournement

Si le problème persiste, utilisez cette solution temporaire :

1. **Après création de flotte, rechargez manuellement la page** (F5)
2. **Ou déconnectez-vous et reconnectez-vous**

## 📝 Prochaines Améliorations

- [ ] Implémenter un système de cache plus robuste
- [ ] Utiliser React Query pour gérer les memberships
- [ ] Ajouter un indicateur de chargement pendant le rafraîchissement

---

**Dernière mise à jour :** 2024
