# Debug - Bouton Invitations non cliquable

## ✅ Corrections appliquées

1. **Ajouté `type="button"`** : Évite les soumissions de formulaire accidentelles
2. **Ajouté `e.preventDefault()` et `e.stopPropagation()`** : Empêche la propagation d'événements
3. **Ajouté `zIndex: 10`** : S'assure que le bouton est au-dessus des autres éléments
4. **Ajouté des logs de debug** : Pour diagnostiquer les problèmes

## 🔍 Diagnostic étape par étape

### Étape 1 : Vérifier dans la console

1. Ouvrez la console du navigateur (F12)
2. Cliquez sur le bouton "Créer une invitation"
3. Vérifiez si vous voyez :
   - `"Opening invitation dialog, userFleetId: ..."`
   - `"Button clicked, isCreateDialogOpen: false"`

**Si vous voyez les logs** → Le onClick fonctionne, le problème est ailleurs
**Si vous ne voyez rien** → Le onClick ne se déclenche pas (problème d'overlay/CSS)

### Étape 2 : Inspecter le bouton

1. Clic droit sur le bouton → **Inspecter**
2. Vérifiez dans l'inspecteur :
   - **Styles** : Cherchez `pointer-events: none` (devrait être `auto`)
   - **Position** : Vérifiez s'il y a un élément qui le couvre
   - **Z-index** : Vérifiez la valeur (devrait être 10 maintenant)

### Étape 3 : Vérifier les éléments qui pourraient bloquer

Dans l'inspecteur, cherchez :
- Éléments avec `position: fixed` ou `absolute` qui pourraient couvrir le bouton
- Overlays de dialogs qui seraient restés ouverts
- Éléments avec `z-index` plus élevé

### Étape 4 : Test direct dans la console

Dans la console du navigateur, exécutez :

```javascript
// Trouver le bouton
const button = document.querySelector('button:has(svg + span:contains("Créer une invitation"))');
// Ou plus simple :
const buttons = Array.from(document.querySelectorAll('button'));
const inviteButton = buttons.find(btn => btn.textContent.includes('Créer une invitation'));

// Vérifier si le bouton existe
console.log('Button found:', inviteButton);

// Vérifier les styles
console.log('Computed styles:', window.getComputedStyle(inviteButton));

// Tester le clic programmatique
inviteButton?.click();
```

## 🛠️ Solutions possibles

### Solution 1 : Dialog ouvert par défaut

Vérifiez si `isCreateDialogOpen` est `true` par défaut. Si oui, le Dialog overlay pourrait bloquer les clics.

**Test** : Dans la console, vérifiez :
```javascript
// Vérifier si un Dialog est ouvert
document.querySelector('[role="dialog"]')
```

### Solution 2 : Overlay invisible

Un overlay de Dialog pourrait être resté ouvert mais invisible.

**Solution** : Rechargez complètement la page (Ctrl+Shift+R)

### Solution 3 : Problème de CSS global

Un style global pourrait affecter tous les boutons de cette page.

**Test** : Inspectez le bouton "Rapport" qui fonctionne et comparez avec le bouton "Invitations"

### Solution 4 : Problème de rendu conditionnel

Le bouton pourrait ne pas être rendu correctement.

**Test** : Vérifiez dans l'inspecteur si le bouton existe dans le DOM

## 📝 Test rapide

Ajoutez temporairement ce code dans `src/pages/Invitations.tsx` pour forcer le clic :

```tsx
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'i' && e.ctrlKey) {
      console.log('Force opening dialog');
      setIsCreateDialogOpen(true);
    }
  };
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, []);
```

Puis appuyez sur **Ctrl+I** pour forcer l'ouverture du dialog.

---

**Le bouton devrait maintenant être cliquable avec les corrections appliquées. Si le problème persiste, utilisez les tests ci-dessus pour identifier la cause exacte.**
