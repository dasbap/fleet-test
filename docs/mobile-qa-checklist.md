# Checklist QA mobile — Flotte E-Samba (Capacitor)

À exécuter après `npm run mobile:prepare` (ou `npm run android` / `npm run ios`) sur **appareil réel** ou émulateur, avec `.env.local` contenant les `VITE_SUPABASE_*` utilisés au build.

Références : [deep-links-esamba.md](./deep-links-esamba.md), [auth-flow.md](./auth-flow.md), [publication-stores.md](./publication-stores.md), [offline-test-matrix-web-mobile.md](./offline-test-matrix-web-mobile.md).

## Préparation

- [ ] `npm run verify:capacitor-config`
- [ ] `npm run mobile:prepare` sans erreur ; `dist/index.html` présent
- [ ] Supabase → Authentication → Redirect URLs : `esamba://auth/callback`, `esamba://auth/update-password`, et/ou `https://www.e-samba.com/auth/**` (voir auth-flow § mobile)
- [ ] Android : `assetlinks.json` SHA-256 renseigné (Play App Signing) si test App Links HTTPS
- [ ] iOS : `TEAMID` dans `apple-app-site-association` + Associated Domains activés sur l’App ID

## Authentification

- [ ] Connexion email / mot de passe
- [ ] Inscription (si activée)
- [ ] Mot de passe oublié → email → ouverture app (`esamba://auth/update-password` ou lien HTTPS)
- [ ] Magic link → `esamba://auth/callback` ou `/auth/callback` sur le web
- [ ] Session persistante après fermeture forcée de l’app
- [ ] Déconnexion puis reconnexion

## Onboarding et navigation

- [ ] Premier login → `/start` ou `/onboarding` selon profil
- [ ] Onglets mobile : accueil, flotte, alertes, guides (tutoriels), compte
- [ ] Dashboard métier (véhicule, alerte, déclaration incident si applicable)

## Deep links

- [ ] `esamba://alerts` → liste alertes
- [ ] `esamba://fleet` → liste véhicules
- [ ] Notification push avec `esambaUrl` dans le payload
- [ ] (Après App Links) `https://www.e-samba.com/dashboard/...` ouvre l’app installée

Commandes ADB (Android) :

```bash
adb shell am start -a android.intent.action.VIEW -d "esamba://alerts" -n com.esamba.flotte/.MainActivity
adb shell am start -a android.intent.action.VIEW -d "esamba://fleet" -n com.esamba.flotte/.MainActivity
adb shell am start -a android.intent.action.VIEW -d "esamba://auth/callback?code=test" -n com.esamba.flotte/.MainActivity
```

## Push notifications

- [ ] Demande de permission (Android 13+, iOS)
- [ ] Notification en avant-plan iOS : badge, son, bannière
- [ ] Tap sur notification → écran cible (deep link)

## Tutoriels vidéo (onglet Guides)

- [ ] `npm run upload:tutorial-thumbs` puis `npm run verify:tutorials-storage` → **10/10 SVG OK**
- [ ] Liste `/dashboard/tutorials` : 10 cartes, vignettes **SVG** visibles, titres métier FR
- [ ] Tap carte → lecteur `/dashboard/tutorials/tuto-XX`
- [ ] Sans MP4 : écran « vidéo bientôt disponible » (pas d’écran noir)
- [ ] Avec MP4 uploadés : lecture en ligne (Wi‑Fi / 4G) après interaction utilisateur
- [ ] iOS : lecture inline (`playsInline`) quand la vidéo est disponible
- [ ] Erreur réseau : message FR + bouton « Actualiser »
- [ ] Téléchargement hors ligne (natif) uniquement si la vidéo est en ligne sur Storage
- [ ] Favori persisté après redémarrage (compte connecté)
- [ ] Bouton retour Android depuis le lecteur → liste tutoriels
- [ ] Deep link `https://www.e-samba.com/dashboard/tutorials/tuto-03` (App Links)

## Offline minimal

- [ ] Écran déjà visité reste utilisable sans réseau (cache React Query / tutoriels selon [offline-test-matrix-web-mobile.md](./offline-test-matrix-web-mobile.md))
- [ ] Message ou état dégradé cohérent si action nécessite le réseau

## Non-régression web

- [ ] `npm run build` (mode production Vercel, `base: /`)
- [ ] Auth et navigation sur `https://www.e-samba.com` inchangées

## Visuel

- [ ] Cold start : splash système → splash plugin (~2 s, fond sombre) → UI
- [ ] Icône lanceur correcte (`npm run cap:assets` si logo modifié)
