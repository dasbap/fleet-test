# Debug - Problème d'ouverture du dialog Invitations

## 🔍 Étapes de diagnostic

### 1. Vérifier dans la console du navigateur

Ouvrez la console (F12) et vérifiez :

```javascript
// Vérifier si le bouton est cliqué
// Vous devriez voir : "Opening invitation dialog, userFleetId: ..."
```

### 2. Vérifier userFleetId

Dans la console, tapez :

```javascript
// Vérifier les données d'authentification
const authData = JSON.parse(localStorage.getItem('sb-zqxjvmejoktwlcqshnwi-auth-token') || '{}');
console.log('Auth data:', authData);
```

### 3. Vérifier les erreurs React

Dans la console, cherchez des erreurs rouges qui pourraient indiquer :
- Erreurs de rendu
- Erreurs de props
- Erreurs de validation

### 4. Vérifier le state du dialog

Ajoutez temporairement dans `src/pages/Invitations.tsx` :

```tsx
console.log("Dialog state:", {
  isCreateDialogOpen,
  userFleetId,
  role,
  canManageInvitations
});
```

## 🛠️ Solutions rapides

### Solution 1 : Vérifier que le composant est bien importé

Vérifiez dans `src/pages/Invitations.tsx` :

```tsx
import { CreateInvitationDialog } from "@/components/invitations/CreateInvitationDialog";
```

### Solution 2 : Vérifier que le dialog est bien rendu

Le dialog devrait être rendu même si `userFleetId` est null (il affichera un message d'erreur).

### Solution 3 : Vérifier les permissions RLS

Dans Supabase Dashboard → Authentication → Policies, vérifiez que vous pouvez :
- Lire les `fleet_memberships`
- Lire les `fleets`

### Solution 4 : Recharger complètement

1. Arrêtez le serveur (Ctrl+C)
2. Supprimez le cache : `rm -rf node_modules/.vite`
3. Redémarrez : `npm run dev`
4. Rechargez la page (Ctrl+Shift+R pour forcer le rechargement)

## 📊 Informations à collecter

Si le problème persiste, collectez ces informations :

1. **Console du navigateur** : Toutes les erreurs
2. **Réseau** (onglet Network) : Requêtes Supabase qui échouent
3. **Application** (onglet Application) : Données dans Local Storage
4. **Résultat de la requête SQL** : Votre membership de flotte

---

**Le dialog devrait maintenant s'ouvrir. Si le problème persiste, vérifiez la console pour les erreurs spécifiques.**
