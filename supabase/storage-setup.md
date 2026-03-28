# Configuration du stockage Supabase

## Déploiement automatisé (recommandé)

Les migrations dans `supabase/migrations/` créent ou mettent à jour :

- **`20260328150000_incidents_incident_category.sql`** — colonne `public.incidents.incident_category`
- **`20260328160000_storage_incident_evidence_bucket.sql`** — bucket `incident-evidence` (public) + politiques Storage

Depuis la racine du dépôt (projet Supabase lié : `supabase link`) :

```bash
npx supabase db push
```

Ou avec une URL de base directe :

```bash
npx supabase db push --db-url "postgresql://postgres:[MOT_DE_PASSE]@[HOST]:5432/postgres"
```

### Dépannage : `failed to parse environment file: .env.local (unexpected character '»' in variable name)`

Le CLI Supabase charge `.env.local` à la racine. Un **BOM UTF-8** (octets `EF BB BF` en tête de fichier) fait échouer l’analyseur : le premier caractère est alors interprété comme `»`.

**Correctif (PowerShell, à la racine du repo)** — réécriture sans BOM en conservant le contenu :

```powershell
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$p = Join-Path (Get-Location) ".env.local"
$text = [System.IO.File]::ReadAllText($p).TrimStart([char]0xFEFF)
[System.IO.File]::WriteAllText($p, $text, $utf8NoBom)
```

Ou supprimez les 3 premiers octets si le fichier commence par le BOM :

```powershell
$p = ".env.local"
$b = [System.IO.File]::ReadAllBytes((Resolve-Path $p))
if ($b.Length -ge 3 -and $b[0] -eq 0xEF -and $b[1] -eq 0xBB -and $b[2] -eq 0xBF) {
  [System.IO.File]::WriteAllBytes((Resolve-Path $p), $b[3..($b.Length-1)])
}
```

Ensuite relancez `npx supabase db push`.

**Sans toucher au fichier** : passez l’URL Postgres directement (mot de passe dans [Database settings](https://supabase.com/dashboard/project/_/settings/database)) :

```bash
npx supabase db push --db-url "postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"
```

(Utilisez l’URI du mode **session** ou **direct** indiqué par Supabase ; encodez les caractères spéciaux du mot de passe dans l’URL.)

## Buckets nécessaires

### 1. `maintenance-evidence`

**Description** : Stockage des preuves de maintenance (photos, documents)

**Configuration** :
1. Allez dans tableau de bord Supabase → Storage
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

### 2. `incident-evidence`

**Description** : photos jointes aux signalements d’incidents (`incidents.evidence_path`, URL publique).

**Automatique** : la migration `20260328160000_storage_incident_evidence_bucket.sql` insère le bucket et les politiques ci-dessous. Sinon, création manuelle équivalente :

1. Tableau de bord Supabase → **Storage** → **New bucket** → nom `incident-evidence`, cocher **Public bucket** (ou exécuter la migration SQL).
2. Politiques sur `storage.objects` :

```sql
-- Lecture publique (URLs getPublicUrl)
CREATE POLICY "incident_evidence_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'incident-evidence');

-- Upload utilisateurs connectés
CREATE POLICY "incident_evidence_insert_authenticated"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'incident-evidence');
```

**Structure des fichiers** : `{fleet_id}/{vehicle_id}/{uuid}.(jpeg|png)` (voir `IncidentEvidenceRepository`).

### 3. `avatars` (optionnel)

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

### Preuves de maintenance
- Chemin : `{job_id}/{filename}`
- Exemple : `550e8400-e29b-41d4-a716-446655440000/photo-maintenance.jpg`

### Avatars
- Chemin : `{user_id}/avatar.{ext}`
- Exemple : `550e8400-e29b-41d4-a716-446655440000/avatar.jpg`

### Preuves d’incident (`incident-evidence`)
- Chemin : `{fleet_id}/{vehicle_id}/{uuid}.(jpeg|png)`
- Exemple : `a1b2c3d4-…/e5f6…/f7g8h9….jpeg`

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

- Les buckets `maintenance-evidence` et `avatars` peuvent encore être créés manuellement si vous n’appliquez pas toutes les migrations ; **`incident-evidence` est créé par la migration** `20260328160000_storage_incident_evidence_bucket.sql`.
- Les politiques RLS doivent être configurées pour la sécurité
- Utilisez `upsert: true` pour les avatars afin de remplacer l'ancien
- Limitez la taille des fichiers (ex: 5MB pour avatars, 10MB pour maintenance)
