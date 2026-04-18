# Notes de sécurité - Smart Fleet Africa

## 🔒 Clés Supabase

### Clés configurées

✅ **Clé ANON (publique)** : Configurée dans `.env.local`
- ✅ Sûre à exposer côté client
- ✅ Utilisée dans `src/integrations/supabase/client.ts`
- ✅ Protégée par les politiques RLS (Row Level Security)

⚠️ **Clé SERVICE_ROLE (privée)** : **NE JAMAIS EXPOSER**
- ❌ **NE JAMAIS** mettre dans `.env.local` ou tout fichier côté client
- ❌ **NE JAMAIS** commiter dans Git
- ✅ Utiliser uniquement dans des environnements serveur sécurisés
- ✅ Utiliser uniquement pour des opérations administratives backend

### Stockage sécurisé de la clé service_role

Si vous devez utiliser la clé service_role (par exemple pour des fonctions serveur) :

1. **Ne JAMAIS** l'ajouter dans un fichier `.env` côté client
2. Utiliser des variables d'environnement serveur uniquement
3. Utiliser des services comme :
   - Vercel Environment Variables (pour les fonctions serverless)
   - AWS Secrets Manager
   - Azure Key Vault
   - Variables d'environnement système (serveur dédié)

## 📁 Fichiers sensibles

Les fichiers suivants sont dans `.gitignore` et ne seront **JAMAIS** commités :

- `.env`
- `.env.local`
- `.env.*.local`

## ✅ Vérification de sécurité

Exécutez régulièrement :

```bash
npm run check:supabase
```

Ce script vérifie :
- ✅ Présence du fichier `.env.local`
- ✅ Configuration correcte des variables
- ✅ Utilisation des variables d'environnement dans le code (pas de hardcoding)

## 🛡️ Bonnes pratiques

1. **Ne jamais hardcoder les clés** dans le code source
2. **Toujours utiliser** `import.meta.env.VITE_SUPABASE_*`
3. **Vérifier** que `.env.local` est dans `.gitignore`
4. **Régénérer** les clés si elles sont compromises
5. **Utiliser** les politiques RLS pour la sécurité des données

## 🔄 Régénération des clés

Si une clé est compromise :

1. Allez dans Supabase Dashboard → Settings → API
2. Régénérez la clé compromise
3. Mettez à jour `.env.local` avec la nouvelle clé
4. Redéployez l'application

## 📚 Ressources

- [Documentation Supabase Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Best Practices for API Keys](https://supabase.com/docs/guides/api/api-keys)
