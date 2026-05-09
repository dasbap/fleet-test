# Composant CreateInvitationDialog

## Description

Le composant `CreateInvitationDialog` permet aux organizers et managers de créer des codes d'invitation pour inviter des chauffeurs à rejoindre leur flotte.

## Fonctionnalités

✅ **Génération automatique de code** : Génère un code unique aléatoire (format: INV-XXXXXX)
✅ **Code personnalisable** : Possibilité de définir manuellement le code
✅ **Expiration optionnelle** : Définir une date d'expiration (1-365 jours)
✅ **Limite d'utilisation** : Limiter le nombre de fois qu'une invitation peut être utilisée (1-1000)
✅ **Copie du code** : Bouton pour copier le code dans le presse-papiers
✅ **Validation** : Validation complète avec messages d'erreur
✅ **Interface utilisateur** : Dialog moderne avec shadcn/ui

## Utilisation

### Exemple basique

```tsx
import { useState } from "react";
import { CreateInvitationDialog } from "@/components/invitations/CreateInvitationDialog";
import { Button } from "@/components/ui/button";
import { Ticket } from "lucide-react";

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);
  const { userFleetId } = useAuth();

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Ticket className="mr-2 h-4 w-4" />
        Créer une invitation
      </Button>

      <CreateInvitationDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        fleetId={userFleetId || ""}
        onSuccess={() => {
          console.log("Invitation créée avec succès!");
        }}
      />
    </>
  );
}
```

### Intégration dans une page

```tsx
import { useState } from "react";
import { CreateInvitationDialog } from "@/components/invitations/CreateInvitationDialog";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Ticket } from "lucide-react";

export default function DriversPage() {
  const { userFleetId, role } = useAuth();
  const [isInvitationDialogOpen, setIsInvitationDialogOpen] = useState(false);

  // Seuls les organizers et managers peuvent créer des invitations
  const canCreateInvitations = role === "organizer" || role === "manager";

  return (
    <div>
      {canCreateInvitations && (
        <Button onClick={() => setIsInvitationDialogOpen(true)}>
          <Ticket className="mr-2 h-4 w-4" />
          Créer une invitation
        </Button>
      )}

      <CreateInvitationDialog
        open={isInvitationDialogOpen}
        onOpenChange={setIsInvitationDialogOpen}
        fleetId={userFleetId || ""}
        onSuccess={() => {
          // Rafraîchir la liste des invitations si nécessaire
          console.log("Invitation créée!");
        }}
      />
    </div>
  );
}
```

## Props

| Prop | Type | Description | Requis |
|------|------|-------------|--------|
| `open` | `boolean` | Contrôle l'ouverture/fermeture du dialog | ✅ |
| `onOpenChange` | `(open: boolean) => void` | Callback appelé quand l'état du dialog change | ✅ |
| `fleetId` | `string` | ID de la flotte pour laquelle créer l'invitation | ✅ |
| `onSuccess` | `() => void` | Callback appelé après la création réussie | ❌ |

## Validation

Le formulaire valide :
- **Code** : Minimum 3 caractères, maximum 50 caractères
- **Expiration** : Si activée, entre 1 et 365 jours
- **Limite d'utilisation** : Si activée, entre 1 et 1000 utilisations
- **Unicité** : Le code doit être unique dans la base de données

## Format du code

Le code généré automatiquement suit le format : `INV-XXXXXX`
- Préfixe : `INV-`
- 6 caractères aléatoires : Lettres majuscules et chiffres (exclut les caractères ambigus comme I, O, 0, 1)

## Permissions

Les politiques RLS de Supabase vérifient automatiquement que :
- L'utilisateur est authentifié
- L'utilisateur a le rôle `manager` ou `organizer` pour la flotte spécifiée

## Gestion des erreurs

Le composant gère automatiquement :
- Codes d'invitation dupliqués
- Erreurs de connexion
- Erreurs de permissions
- Validation des champs

## Exemple de code généré

```
INV-A3B7K9
INV-X2M5P8
INV-R9T4W6
```

## Notes

- Le code est automatiquement converti en majuscules
- Les dates d'expiration sont calculées à partir de la date actuelle
- Le compteur `current_uses` est initialisé à 0 automatiquement
- L'invitation est créée avec `created_by` = ID de l'utilisateur actuel
