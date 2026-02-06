# Comment créer une invitation - Smart Fleet Africa

## 📋 Vue d'ensemble

Les invitations permettent aux organizers et managers d'inviter des chauffeurs à rejoindre leur flotte. Il existe deux méthodes pour créer des invitations :

1. **Via Supabase SQL Editor** (méthode rapide pour tester)
2. **Via l'interface utilisateur** (à implémenter)

---

## 🔧 Méthode 1 : Créer une invitation via SQL (Recommandé pour tester)

### Étape 1 : Obtenir votre Fleet ID

1. Connectez-vous à votre application sur http://localhost:8080
2. Ouvrez la console du navigateur (F12)
3. Dans l'onglet **Application** → **Local Storage**, cherchez votre session
4. Ou allez dans Supabase Dashboard → **Table Editor** → `fleets` et copiez l'ID de votre flotte

### Étape 2 : Créer l'invitation dans Supabase

1. Allez dans **Supabase Dashboard** → **SQL Editor**
2. Exécutez cette requête SQL :

```sql
-- Créer une invitation simple (sans expiration, usage illimité)
INSERT INTO fleet_invitations (
  fleet_id,
  code,
  expires_at,
  max_uses,
  created_by
)
VALUES (
  'VOTRE_FLEET_ID_ICI',  -- Remplacez par votre Fleet ID
  'INVITE123',           -- Code d'invitation (vous pouvez le personnaliser)
  NULL,                   -- NULL = pas d'expiration
  NULL,                   -- NULL = usage illimité
  auth.uid()              -- ID de l'utilisateur actuel (vous)
)
RETURNING *;
```

### Exemples d'invitations

#### Invitation avec expiration (7 jours)

```sql
INSERT INTO fleet_invitations (
  fleet_id,
  code,
  expires_at,
  max_uses,
  created_by
)
VALUES (
  'VOTRE_FLEET_ID_ICI',
  'INVITE456',
  NOW() + INTERVAL '7 days',  -- Expire dans 7 jours
  NULL,                        -- Usage illimité
  auth.uid()
)
RETURNING *;
```

#### Invitation avec limite d'utilisation (5 utilisations max)

```sql
INSERT INTO fleet_invitations (
  fleet_id,
  code,
  expires_at,
  max_uses,
  created_by
)
VALUES (
  'VOTRE_FLEET_ID_ICI',
  'INVITE789',
  NULL,      -- Pas d'expiration
  5,         -- Maximum 5 utilisations
  auth.uid()
)
RETURNING *;
```

#### Invitation avec expiration ET limite d'utilisation

```sql
INSERT INTO fleet_invitations (
  fleet_id,
  code,
  expires_at,
  max_uses,
  created_by
)
VALUES (
  'VOTRE_FLEET_ID_ICI',
  'INVITE999',
  NOW() + INTERVAL '30 days',  -- Expire dans 30 jours
  10,                          -- Maximum 10 utilisations
  auth.uid()
)
RETURNING *;
```

### Étape 3 : Vérifier l'invitation créée

```sql
-- Voir toutes vos invitations
SELECT 
  fi.id,
  fi.code,
  fi.expires_at,
  fi.max_uses,
  fi.current_uses,
  f.name as fleet_name,
  fi.created_at
FROM fleet_invitations fi
JOIN fleets f ON f.id = fi.fleet_id
WHERE fi.created_by = auth.uid()
ORDER BY fi.created_at DESC;
```

---

## 🎨 Méthode 2 : Créer une invitation via l'interface (Disponible)

✅ **Le composant `CreateInvitationDialog` est maintenant disponible !**

Le composant permet de créer des invitations directement depuis l'interface utilisateur avec :
- ✅ Génération automatique de code d'invitation (format: INV-XXXXXX)
- ✅ Code personnalisable manuellement
- ✅ Option pour définir une expiration (1-365 jours)
- ✅ Option pour définir une limite d'utilisation (1-1000)
- ✅ Affichage du code généré avec bouton de copie
- ✅ Validation complète avec messages d'erreur

### Utilisation du composant

```tsx
import { CreateInvitationDialog } from "@/components/invitations/CreateInvitationDialog";
import { useAuth } from "@/hooks/useAuth";

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);
  const { userFleetId } = useAuth();

  return (
    <CreateInvitationDialog
      open={isOpen}
      onOpenChange={setIsOpen}
      fleetId={userFleetId || ""}
      onSuccess={() => console.log("Invitation créée!")}
    />
  );
}
```

Consultez `src/components/invitations/README.md` pour plus de détails et d'exemples.

---

## 📝 Utiliser une invitation

### Pour les utilisateurs

1. Allez sur la page d'inscription : http://localhost:8080?mode=signup
2. Entrez le code d'invitation dans le champ prévu
3. Le système vérifie automatiquement la validité du code
4. Complétez l'inscription
5. Vous serez automatiquement ajouté à la flotte en tant que chauffeur

### Vérifier qu'une invitation a été utilisée

```sql
-- Voir les invitations et leur utilisation
SELECT 
  fi.code,
  fi.current_uses,
  fi.max_uses,
  CASE 
    WHEN fi.max_uses IS NOT NULL AND fi.current_uses >= fi.max_uses THEN 'Limite atteinte'
    WHEN fi.expires_at IS NOT NULL AND fi.expires_at < NOW() THEN 'Expirée'
    ELSE 'Active'
  END as status,
  f.name as fleet_name
FROM fleet_invitations fi
JOIN fleets f ON f.id = fi.fleet_id
WHERE fi.fleet_id = 'VOTRE_FLEET_ID_ICI'
ORDER BY fi.created_at DESC;
```

---

## 🔒 Sécurité et bonnes pratiques

### Codes d'invitation

- Utilisez des codes **uniques** et **difficiles à deviner**
- Évitez les codes trop simples comme "123" ou "TEST"
- Recommandation : Utilisez une combinaison de lettres et chiffres (ex: "INVITE-ABC123")

### Expiration

- Définissez toujours une expiration pour les invitations sensibles
- Pour les invitations temporaires, utilisez une expiration courte (1-7 jours)
- Pour les invitations permanentes, laissez `expires_at` à NULL

### Limite d'utilisation

- Pour les invitations individuelles, utilisez `max_uses = 1`
- Pour les invitations de groupe, définissez une limite appropriée
- Pour les invitations publiques, laissez `max_uses` à NULL

### Gestion des invitations

- Supprimez les invitations expirées régulièrement
- Surveillez l'utilisation des invitations
- Révoquez les invitations si nécessaire en les supprimant

---

## 🗑️ Supprimer une invitation

```sql
-- Supprimer une invitation spécifique
DELETE FROM fleet_invitations
WHERE code = 'CODE_INVITATION_ICI'
  AND created_by = auth.uid();
```

---

## 📊 Statistiques des invitations

```sql
-- Statistiques des invitations pour votre flotte
SELECT 
  COUNT(*) as total_invitations,
  COUNT(*) FILTER (WHERE expires_at IS NULL OR expires_at > NOW()) as active_invitations,
  COUNT(*) FILTER (WHERE expires_at IS NOT NULL AND expires_at <= NOW()) as expired_invitations,
  SUM(current_uses) as total_uses,
  COUNT(*) FILTER (WHERE max_uses IS NOT NULL AND current_uses >= max_uses) as limit_reached
FROM fleet_invitations
WHERE fleet_id = 'VOTRE_FLEET_ID_ICI';
```

---

## ⚠️ Notes importantes

1. **Permissions** : Seuls les organizers et managers peuvent créer des invitations (vérifié par les politiques RLS)
2. **Codes uniques** : Chaque code doit être unique dans toute la base de données
3. **Validation** : Le système vérifie automatiquement :
   - Si le code existe
   - Si l'invitation n'est pas expirée
   - Si la limite d'utilisation n'est pas atteinte
4. **Automatique** : Quand un utilisateur accepte une invitation, le compteur `current_uses` est incrémenté automatiquement

---

## 🚀 Prochaines étapes

## ✅ Fonctionnalités implémentées

Toutes les améliorations suivantes ont été implémentées :

1. ✅ **Composant `CreateInvitationDialog`** : Créer des invitations via l'interface
2. ✅ **Page "Invitations"** : Page dédiée dans le dashboard (`/dashboard/invitations`)
3. ✅ **Génération automatique de codes** : Codes générés automatiquement (format: INV-XXXXXX)
4. ✅ **Gestion complète** : Liste, création, suppression, copie des codes

### Accéder à la page Invitations

1. Connectez-vous en tant qu'organizer ou manager
2. Dans la sidebar, cliquez sur **"Invitations"** (icône ticket)
3. Ou allez directement sur : http://localhost:8080/dashboard/invitations

La page permet de :
- ✅ Voir toutes les invitations de votre flotte
- ✅ Créer de nouvelles invitations
- ✅ Copier les codes d'invitation
- ✅ Voir le statut (Active, Expirée, Limite atteinte)
- ✅ Voir les statistiques (total, utilisations, expirées)
- ✅ Supprimer des invitations

---

**Pour l'instant, utilisez la méthode SQL pour créer vos invitations !** 🎯
