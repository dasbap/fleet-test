# Composants maintenance

## EvidenceUpload

Composant d’affichage et d’ajout de preuves photo (avant/après) pour un job de maintenance.

### Utilisation

À brancher dans un écran de détail de job (ex. `MaintenanceDetailDialog`) en fournissant :

- **jobId** : identifiant du job
- **kind** : `'before'` (photos avant) ou `'after'` (photos après)
- **existingEvidence** : tableau des preuves déjà enregistrées (`id`, `file_path`, `created_at`)
- **userId** : identifiant de l’utilisateur connecté (pour `created_by`)
- **disabled** (optionnel) : désactive l’ajout et la suppression

Exemple (voir `MaintenanceDetailDialog.tsx`) :

```tsx
<EvidenceUpload
  jobId={job.id}
  kind="before"
  existingEvidence={beforeEvidence}
  userId={user?.id ?? ''}
  disabled={!canEdit}
/>
<EvidenceUpload
  jobId={job.id}
  kind="after"
  existingEvidence={afterEvidence}
  userId={user?.id ?? ''}
  disabled={!canEdit}
/>
```

### Sous-composants et hook

- **useEvidenceUpload** (`@/hooks/useEvidenceUpload`) : logique de sélection, validation, aperçu et envoi.
- **EvidenceGrid** : grille des preuves existantes avec bouton de suppression.
- **EvidencePreviewCard** : carte d’aperçu avant envoi avec actions Téléverser / Annuler.

Les mutations (upload/suppression) et toasts sont gérés par `useUploadEvidence` et `useDeleteEvidence` (`@/hooks/useMaintenanceEvidence`).
