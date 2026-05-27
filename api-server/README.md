# API BFF — api.e-samba.com

Projet Vercel **séparé** du front `www.e-samba.com`.

## Configuration Vercel

1. Créer un projet lié à ce dépôt.
2. **Root Directory** : `api-server`
3. Domaine : `api.e-samba.com`
4. Variables d’environnement : voir `.env.example` (bloc BFF Node).

## Webhook PSP

URL à enregistrer chez le PSP :

`https://api.e-samba.com/webhooks/payment`

## Développement local

Depuis la racine du dépôt :

```bash
npm run dev:api
```

Avec le front : `VITE_DEV_BFF_PROXY=true` dans `.env.local` et `npm run dev`.
