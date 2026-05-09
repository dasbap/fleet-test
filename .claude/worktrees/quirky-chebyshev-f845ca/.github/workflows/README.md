# GitHub Actions Workflows

Ce dossier contient les workflows GitHub Actions pour automatiser les vérifications et déploiements.

## Workflow : Verify Migration Status

Le workflow `verify-migration.yml` vérifie automatiquement l'état de la migration vers le français après chaque modification des migrations Supabase.

### Configuration requise

Pour que ce workflow fonctionne, vous devez configurer les secrets suivants dans GitHub :

1. **SUPABASE_ACCESS_TOKEN** : Token d'accès Supabase
   - Allez dans [Supabase Dashboard](https://app.supabase.com)
   - Sélectionnez votre projet
   - Allez dans Settings > Access Tokens
   - Créez un nouveau token ou utilisez un token existant
   - Copiez le token et ajoutez-le comme secret GitHub

2. **SUPABASE_PROJECT_REF** : Référence du projet Supabase
   - Trouvez votre `project_ref` dans l'URL de votre projet Supabase
   - Format : `https://xxxxx.supabase.co` → `project_ref` = `xxxxx`
   - Ajoutez-le comme secret GitHub

3. **SUPABASE_DB_PASSWORD** (optionnel) : Mot de passe de la base de données
   - Nécessaire uniquement si vous utilisez `supabase link`
   - Peut être omis si vous utilisez uniquement l'API

### Comment configurer les secrets GitHub

1. Allez dans votre dépôt GitHub
2. Cliquez sur **Settings** > **Secrets and variables** > **Actions**
3. Cliquez sur **New repository secret**
4. Ajoutez chaque secret avec son nom et sa valeur

### Déclencheurs

Le workflow s'exécute automatiquement :
- Lors d'un push vers `main` ou `master` qui modifie les fichiers de migration
- Lors d'une pull request vers `main` ou `master` qui modifie les fichiers de migration
- Manuellement via l'onglet **Actions** dans GitHub (workflow_dispatch)

### Résultats

Le workflow :
- Exécute le script de vérification de migration
- Génère un rapport détaillé
- Upload le rapport en tant qu'artifact (disponible pendant 30 jours)
- Comment les pull requests avec les résultats (si applicable)
- Échoue si des erreurs critiques sont détectées

### Utilisation locale

Pour exécuter la vérification localement sans GitHub Actions :

```bash
npm run verify:migration
```

Ou directement :

```bash
supabase db execute --file supabase/verify-migration-status.sql
```

### Dépannage

**Le workflow échoue avec "Authentication failed"**
- Vérifiez que `SUPABASE_ACCESS_TOKEN` est correct et valide
- Vérifiez que le token a les permissions nécessaires

**Le workflow échoue avec "Project not found"**
- Vérifiez que `SUPABASE_PROJECT_REF` est correct
- Vérifiez que le token a accès à ce projet

**Le workflow ne se déclenche pas**
- Vérifiez que les fichiers modifiés correspondent aux `paths` dans le workflow
- Vérifiez que vous poussez vers `main` ou `master`
