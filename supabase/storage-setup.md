# Configuration du stockage Supabase

## Buckets nécessaires

### 1. `maintenance-evidence`

**Description** : Stockage des preuves de maintenance (photos, documents)

**Configuration** :
1. Allez dans Supabase Dashboard → Storage
2. Créez un nouveau bucket nommé `maintenance-evidence`
3. Configurez les politiques d'accès :

```sql
-- Politique pour permettre l'upload aux utilisateurs authentifiés
CREATE POLICY "Users can upload maintenance evidence"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'maintenance-evidence');

-- Politique pour permettre la lecture aux utilisateurs authentifiés
CREATE POLICY "Users can read maintenance evidence"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'maintenance-evidence');

-- Politique pour permettre la suppression aux propriétaires
CREATE POLICY "Users can delete their own maintenance evidence"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'maintenance-evidence' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### 2. `avatars` (optionnel)

**Description** : Stockage des avatars utilisateurs

**Configuration** :
1. Créez un bucket nommé `avatars`
2. Configurez les politiques :

```sql
-- Politique pour permettre l'upload de son propre avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Politique pour permettre la lecture publique des avatars
CREATE POLICY "Avatars are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Politique pour permettre la mise à jour de son propre avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Politique pour permettre la suppression de son propre avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

## Structure des fichiers

### Maintenance Evidence
- Chemin : `{job_id}/{filename}`
- Exemple : `550e8400-e29b-41d4-a716-446655440000/photo-maintenance.jpg`

### Avatars
- Chemin : `{user_id}/avatar.{ext}`
- Exemple : `550e8400-e29b-41d4-a716-446655440000/avatar.jpg`

## Utilisation dans le code

### Upload de preuve de maintenance

```typescript
const { data, error } = await supabase.storage
  .from('maintenance-evidence')
  .upload(`${jobId}/${fileName}`, file);
```

### Upload d'avatar

```typescript
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/avatar.jpg`, file, {
    upsert: true // Remplace l'avatar existant
  });
```

## Notes importantes

- Les buckets doivent être créés manuellement dans Supabase Dashboard
- Les politiques RLS doivent être configurées pour la sécurité
- Utilisez `upsert: true` pour les avatars afin de remplacer l'ancien
- Limitez la taille des fichiers (ex: 5MB pour avatars, 10MB pour maintenance)
