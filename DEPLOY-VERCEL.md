# Guide de déploiement Vercel - E-Samba

Ce guide vous accompagne dans le déploiement de l'application Smart Fleet Africa sur Vercel avec le domaine personnalisé `www.e-samba.com`.

## 📋 Prérequis

- Compte Vercel (gratuit ou payant)
- Compte GitHub avec le dépôt `smart-fleet-africa`
- Accès au registraire de domaine pour `e-samba.com`
- Variables d'environnement Supabase :
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

## 🚀 Phase 1 : Connexion du dépôt GitHub à Vercel

### Étape 1.1 : Créer un projet Vercel

1. Connectez-vous à [Vercel Dashboard](https://vercel.com/dashboard)
2. Cliquez sur **"Add New..."** → **"Project"**
3. Sélectionnez votre dépôt GitHub `smart-fleet-africa`
4. Vercel détectera automatiquement Vite

### Étape 1.2 : Configuration du projet

Vercel devrait détecter automatiquement :
- **Framework Preset** : Vite
- **Build Command** : `npm run build`
- **Output Directory** : `dist`
- **Install Command** : `npm install`

Si ce n'est pas le cas, configurez manuellement :
- **Framework Preset** : Vite
- **Root Directory** : `./` (racine du projet)
- **Build Command** : `npm run build`
- **Output Directory** : `dist`
- **Install Command** : `npm install`

⚠️ **Important** : Ne cliquez pas encore sur "Deploy" ! Configurez d'abord les variables d'environnement.

## 🔐 Phase 2 : Configuration des variables d'environnement

### Étape 2.1 : Ajouter les variables dans Vercel

1. Dans la page de configuration du projet, cliquez sur **"Environment Variables"**
2. Ajoutez les deux variables suivantes :

#### Variable 1 : `VITE_SUPABASE_URL`
- **Name** : `VITE_SUPABASE_URL`
- **Value** : Votre URL Supabase (ex: `https://xxxxx.supabase.co`)
- **Environments** : ✅ Production, ✅ Preview, ✅ Development

#### Variable 2 : `VITE_SUPABASE_ANON_KEY`
- **Name** : `VITE_SUPABASE_ANON_KEY`
- **Value** : Votre clé anonyme Supabase
- **Environments** : ✅ Production, ✅ Preview, ✅ Development

### Étape 2.2 : Où trouver vos clés Supabase ?

1. Connectez-vous à [Supabase Dashboard](https://app.supabase.com)
2. Sélectionnez votre projet
3. Allez dans **Settings** → **API**
4. Copiez :
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

⚠️ **Sécurité** : La clé `anon` est publique et sécurisée par les politiques RLS (Row Level Security) de Supabase. Ne partagez jamais la clé `service_role`.

## 🌐 Phase 3 : Configuration du domaine personnalisé

### Étape 3.1 : Ajouter le domaine dans Vercel

1. Dans votre projet Vercel, allez dans **Settings** → **Domains**
2. Cliquez sur **"Add Domain"**
3. Entrez `www.e-samba.com`
4. Vercel vous affichera les enregistrements DNS à configurer

### Étape 3.2 : Configuration DNS chez votre registraire

Vercel vous fournira des instructions spécifiques, mais généralement :

#### Option A : Configuration avec CNAME (recommandé)

1. Connectez-vous à votre registraire de domaine (ex: OVH, Namecheap, GoDaddy)
2. Allez dans la gestion DNS de `e-samba.com`
3. Ajoutez/modifiez les enregistrements suivants :

```
Type    Name    Value
CNAME   www     cname.vercel-dns.com
```

#### Option B : Configuration avec A Record

Si CNAME n'est pas supporté :

```
Type    Name    Value
A       www     76.76.21.21
```

⚠️ **Note** : Les adresses IP peuvent changer. Vérifiez les instructions exactes dans Vercel Dashboard.

### Étape 3.3 : Vérification de la propagation DNS

1. Attendez 5-30 minutes pour la propagation DNS
2. Vérifiez avec un outil en ligne : [whatsmydns.net](https://www.whatsmydns.net)
3. Dans Vercel, le statut du domaine passera à **"Valid Configuration"** une fois la propagation terminée

### Étape 3.4 : Configuration SSL automatique

Vercel configure automatiquement un certificat SSL gratuit via Let's Encrypt. Aucune action requise.

## 🚀 Phase 4 : Déploiement initial

### Étape 4.1 : Lancer le premier déploiement

1. Revenez à la page de configuration du projet
2. Vérifiez que toutes les variables d'environnement sont configurées
3. Cliquez sur **"Deploy"**
4. Attendez la fin du build (2-5 minutes)

### Étape 4.2 : Vérifier le déploiement

1. Une fois le déploiement terminé, cliquez sur le lien de prévisualisation
2. Vérifiez que l'application se charge correctement
3. Testez la connexion Supabase (essayez de vous connecter)

## ✅ Phase 5 : Vérification post-déploiement

### Checklist de vérification

- [ ] L'application se charge sur l'URL Vercel (ex: `smart-fleet-africa.vercel.app`)
- [ ] Le routing SPA fonctionne (navigation entre les pages)
- [ ] La connexion Supabase fonctionne (authentification)
- [ ] Le domaine `www.e-samba.com` est configuré et accessible
- [ ] Le certificat SSL est actif (https://)
- [ ] Les variables d'environnement sont correctement chargées

### Tests à effectuer

1. **Test de routing** :
   - Accédez à `https://www.e-samba.com/dashboard`
   - Vérifiez que la page se charge sans erreur 404

2. **Test d'authentification** :
   - Essayez de vous connecter
   - Vérifiez que la connexion à Supabase fonctionne

3. **Test de navigation** :
   - Naviguez entre différentes pages
   - Vérifiez que le routing côté client fonctionne

## 🔄 Phase 6 : Déploiements automatiques

### Configuration Git

Une fois le projet connecté, Vercel déploiera automatiquement :

- **Push sur `main`** → Déploiement en production
- **Pull Request** → Déploiement de prévisualisation
- **Push sur autres branches** → Déploiement de prévisualisation

### Workflow recommandé

1. Développez sur une branche feature
2. Créez une Pull Request → Vercel crée un déploiement de prévisualisation
3. Testez sur l'URL de prévisualisation
4. Merge dans `main` → Déploiement automatique en production

## 🛠️ Dépannage

### Problème : Erreur "Variable d'environnement manquante"

**Solution** :
1. Vérifiez que les variables sont bien configurées dans Vercel Dashboard
2. Vérifiez que les noms commencent par `VITE_` (requis pour Vite)
3. Redéployez le projet après avoir ajouté les variables

### Problème : Erreur 404 sur les routes

**Solution** :
1. Vérifiez que `vercel.json` est présent à la racine du projet
2. Vérifiez que la configuration `rewrites` est correcte
3. Redéployez le projet

### Problème : Le domaine ne fonctionne pas

**Solution** :
1. Vérifiez la configuration DNS avec [whatsmydns.net](https://www.whatsmydns.net)
2. Attendez 30 minutes pour la propagation complète
3. Vérifiez dans Vercel Dashboard que le domaine est "Valid Configuration"
4. Contactez le support Vercel si le problème persiste

### Problème : Erreur de build

**Solution** :
1. Testez le build localement : `npm run build`
2. Vérifiez les logs de build dans Vercel Dashboard
3. Vérifiez que toutes les dépendances sont dans `package.json`
4. Vérifiez que Node.js version est compatible (Vercel utilise Node 18+ par défaut)

### Problème : Connexion Supabase échoue

**Solution** :
1. Vérifiez que les variables d'environnement sont correctes dans Vercel
2. Vérifiez que l'URL Supabase est accessible publiquement
3. Vérifiez les politiques RLS dans Supabase Dashboard
4. Vérifiez les logs de la console du navigateur (F12)

## 📊 Monitoring et Analytics

### Vercel Analytics (optionnel)

1. Dans Vercel Dashboard → **Analytics**
2. Activez Vercel Analytics pour suivre les performances
3. Configurez les événements personnalisés si nécessaire

### Logs de déploiement

- Consultez les logs dans **Deployments** → Cliquez sur un déploiement
- Les logs incluent les erreurs de build et les warnings

## 🔒 Sécurité

### Bonnes pratiques

1. ✅ Ne jamais commiter les variables d'environnement dans Git
2. ✅ Utiliser uniquement la clé `anon` de Supabase (jamais `service_role`)
3. ✅ Configurer les politiques RLS dans Supabase
4. ✅ Activer le SSL (automatique avec Vercel)
5. ✅ Vérifier régulièrement les dépendances avec `npm audit`

### Headers de sécurité

Le fichier `vercel.json` configure automatiquement :
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

## 📝 Commandes utiles

### Déploiement manuel (CLI Vercel)

```bash
# Installer Vercel CLI
npm i -g vercel

# Se connecter
vercel login

# Déployer
vercel

# Déployer en production
vercel --prod
```

### Vérification locale

```bash
# Build local
npm run build

# Preview du build
npm run preview
```

## 🎯 Prochaines étapes

Une fois le déploiement réussi :

1. ✅ Configurer les redirections (ex: `e-samba.com` → `www.e-samba.com`)
2. ✅ Configurer les métadonnées Open Graph pour les réseaux sociaux
3. ✅ Configurer Google Analytics (optionnel)
4. ✅ Configurer les webhooks Supabase si nécessaire
5. ✅ Mettre en place un monitoring d'erreurs (ex: Sentry)

## 📞 Support

- **Documentation Vercel** : [vercel.com/docs](https://vercel.com/docs)
- **Support Vercel** : [vercel.com/support](https://vercel.com/support)
- **Documentation Supabase** : [supabase.com/docs](https://supabase.com/docs)

---

**Dernière mise à jour** : Décembre 2024
