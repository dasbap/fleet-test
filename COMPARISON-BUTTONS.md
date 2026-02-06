# Comparaison des boutons - Rapport vs Invitations

## 📊 Structure HTML comparée

### Bouton Rapport (FONCTIONNE)
```tsx
<Button 
  onClick={handleExportPDF} 
  disabled={!report || isLoading}
  size="lg"
>
  <Download className="mr-2 h-5 w-5" />
  PDF
</Button>
```

**Caractéristiques** :
- ✅ Simple `onClick` avec fonction directe
- ✅ Pas de `preventDefault` ou `stopPropagation`
- ✅ Pas de `zIndex` inline
- ✅ Pas de `type="button"` explicite

### Bouton Invitations (NE FONCTIONNE PAS)
```tsx
<Button 
  type="button"
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Opening invitation dialog, userFleetId:", userFleetId);
    if (!userFleetId) {
      toast({...});
      return;
    }
    setIsCreateDialogOpen(true);
  }}
  style={{ position: 'relative', zIndex: 10 }}
>
  <Plus className="w-4 h-4 mr-2" />
  Créer une invitation
</Button>
```

**Caractéristiques** :
- ⚠️ `onClick` avec fonction inline complexe
- ⚠️ `preventDefault` et `stopPropagation`
- ⚠️ `zIndex` inline
- ⚠️ `type="button"` explicite

## 🔍 Différences identifiées

1. **Complexité du handler** : Le bouton Invitations a une logique plus complexe
2. **Event handling** : `preventDefault` et `stopPropagation` pourraient interférer
3. **Styles inline** : `zIndex` pourrait causer des problèmes de stacking

## ✅ Solution : Simplifier le bouton

Le bouton devrait être simplifié pour correspondre au pattern de Reports.
