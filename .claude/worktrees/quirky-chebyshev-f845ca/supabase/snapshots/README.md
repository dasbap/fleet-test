# Snapshots distants Supabase

Ce dossier stocke les exports de référence de la base distante pour figer un état avant rebase/baseline.

## Générer un snapshot

Depuis la racine du projet :

```powershell
npm run freeze:remote-schema
```

Le script crée un dossier horodaté avec :
- `schema.sql` (objets du schéma `public`)
- `roles.sql` (rôles/grants)
- `summary.txt` (métadonnées de l'export)

## Bonnes pratiques

- Ne pas modifier les snapshots exportés.
- Committer uniquement les snapshots validés pour audit/reproductibilité.
- Utiliser le dernier snapshot validé comme source d'une baseline propre.
