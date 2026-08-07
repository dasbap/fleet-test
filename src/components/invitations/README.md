# Composant CreateInvitationDialog

## Description

`CreateInvitationDialog` garde son nom historique, mais le flux ne crée plus de code ni de lien d'invitation. Il crée un compte Supabase Auth via l'Edge Function `create-fleet-member-account`, puis rattache ce compte à la flotte active.

## Fonctionnalités

- Création directe d'un compte membre.
- Rattachement automatique à la flotte fournie par `fleetId`.
- Choix du rôle: organizer, manager, driver ou mechanic.
- Création d'un mot de passe temporaire côté serveur.
- Copie du mot de passe temporaire après création.
- Validation du nom, de l'email, du téléphone optionnel et du rôle.

## Utilisation

```tsx
import { useState } from "react";
import { CreateInvitationDialog } from "@/components/invitations/CreateInvitationDialog";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);
  const { userFleetId } = useAuth();

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <UserPlus className="mr-2 h-4 w-4" />
        Créer un compte
      </Button>

      <CreateInvitationDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        fleetId={userFleetId || ""}
      />
    </>
  );
}
```

## Props

| Prop | Type | Description | Requis |
|------|------|-------------|--------|
| `open` | `boolean` | Contrôle l'ouverture/fermeture du dialog | Oui |
| `onOpenChange` | `(open: boolean) => void` | Callback appelé quand l'état du dialog change | Oui |
| `fleetId` | `string` | ID de la flotte cible | Oui |
| `onSuccess` | `() => void` | Callback appelé après la création réussie | Non |

## Sécurité

La création Auth se fait uniquement dans l'Edge Function `create-fleet-member-account`, avec vérification du JWT utilisateur et de son adhésion active à la flotte. Le navigateur ne manipule pas la clé `service_role`.
