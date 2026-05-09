# Configuration Supabase - Smart Fleet Africa

## 🔒 Sécurité

**IMPORTANT** : Les clés Supabase ne doivent jamais être commitées dans Git. Utilisez toujours des variables d'environnement.

## 📋 Configuration initiale

### 1. Créer le fichier `.env.local`

Copiez le fichier `.env.example` vers `.env.local` :

```bash
cp .env.example .env.local
```

### 2. Remplir les variables d'environnement

Ouvrez `.env.local` et remplissez avec vos valeurs Supabase :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre_cle_anon_ici
```

### 3. Où trouver vos clés Supabase ?

1. Connectez-vous à [Supabase Dashboard](https://app.supabase.com)
2. Sélectionnez votre projet
3. Allez dans **Settings** → **API**
4. Copiez :
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

### 4. Redirect URLs (mot de passe oublié et connexion)

Pour que le **mot de passe oublié** et les redirections après authentification fonctionnent, les URLs de redirection doivent être autorisées :

1. Supabase Dashboard → **Authentication** → **URL Configuration**
2. Dans **Redirect URLs**, ajouter :
   - **Développement** : `http://localhost:8080/auth`
   - **Production** : `https://www.e-samba.com/auth`

Sans ces URLs, le lien « Réinitialiser le mot de passe » dans l’email renverra une erreur de redirection non autorisée.

## 🗄️ Configuration de la base de données

### Exécuter le schéma SQL

1. Ouvrez le fichier `supabase/schema.sql`
2. Connectez-vous à votre projet Supabase
3. Allez dans **SQL Editor**
4. Collez et exécutez tout le contenu du fichier `schema.sql`

### Vérifier la connexion

Le projet vérifie automatiquement la connexion au démarrage. Si vous voyez des erreurs :

1. Vérifiez que `.env.local` existe et contient les bonnes valeurs
2. Vérifiez que le schéma SQL a été exécuté
3. Vérifiez les politiques RLS (Row Level Security) dans Supabase

## 🔐 Politiques de sécurité (RLS)

Le schéma SQL configure automatiquement les politiques RLS pour :

- **Fleet Memberships** : Les utilisateurs ne voient que leurs propres membreships
- **Vehicles** : Basé sur les rôles (manager, organizer, driver)
- **Assignments** : Les drivers voient leurs propres assignments
- **Shifts & Closures** : Basé sur les assignments actifs
- **Incidents** : Les drivers peuvent créer, les managers peuvent lire
- **Maintenance** : Accès basé sur les rôles (mechanic, manager, organizer)

## 📦 Stockage de fichiers

### Configuration du bucket

1. Dans Supabase Dashboard → **Storage**
2. Créez un bucket nommé `fleet-assets` (ou modifiez `src/lib/supabase-config.ts`)
3. Configurez les politiques de stockage :

```sql
-- Exemple de politique pour le bucket fleet-assets
CREATE POLICY "Users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'fleet-assets');

CREATE POLICY "Users can read their files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'fleet-assets');
```

## 🧪 Tests de connexion

### Vérifier la connexion programmatiquement

```typescript
import { checkSupabaseConnection } from '@/lib/supabase-config';

const isConnected = await checkSupabaseConnection();
console.log('Supabase connecté:', isConnected);
```

### Tester depuis la console du navigateur

```javascript
// Dans la console du navigateur (F12)
import { supabase } from '/src/integrations/supabase/client';
const { data, error } = await supabase.from('orgs').select('*').limit(1);
console.log('Test:', { data, error });
```

## 🚀 Déploiement

### Variables d'environnement en production

Pour le déploiement (Vercel, Netlify, etc.) :

1. Ajoutez les variables d'environnement dans les paramètres du projet
2. Utilisez les mêmes noms : `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`
3. Redéployez l'application

### Exemple pour Vercel

```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

## 🔍 Dépannage

### Erreur : "Variable d'environnement manquante"

- Vérifiez que `.env.local` existe à la racine du projet
- Vérifiez que les variables commencent par `VITE_` (requis pour Vite)
- Redémarrez le serveur de développement après modification

### Erreur : "Failed to fetch"

- Vérifiez que l'URL Supabase est correcte
- Vérifiez votre connexion internet
- Vérifiez les politiques RLS dans Supabase

### Erreur : "Invalid API key"

- Vérifiez que vous utilisez la clé **anon** (publique), pas la clé service
- Régénérez la clé si nécessaire dans Supabase Dashboard

## 📚 Ressources

- [Documentation Supabase](https://supabase.com/docs)
- [Guide RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [API Reference](https://supabase.com/docs/reference/javascript/introduction)

## ⚠️ Notes importantes

1. **Ne jamais commiter `.env.local`** - Il est déjà dans `.gitignore`
2. **Utiliser la clé anon côté client** - La clé service ne doit jamais être exposée
3. **Vérifier les politiques RLS** - Assurez-vous qu'elles sont correctement configurées
4. **Backup régulier** - Faites des backups de votre base de données Supabase
