# Structure du code — Flotte E-Samba

Ce document fixe la **cartographie des dossiers** sous `src/` pour l’application **Flotte E-Samba** (React + TypeScript, web et shell natif Capacitor). Il complète [ARCHITECTURE.md](../ARCHITECTURE.md) (couches données / métier) sans les remplacer.

## Rôle des dossiers principaux

| Dossier | Rôle |
|--------|------|
| `src/app/` | Composition du routage : déclaration des `<Route>` (lazy loading), export vers `App.tsx`. |
| `src/navigation/` | Chemins canoniques (`routePaths`), onglets mobile, garde-fous par rôle — **pas** de JSX de routes. |
| `src/pages/` | Entrées de route **minces** : pages transverses (auth, erreur) ou écrans non encore extraits vers une feature. Préférer les features pour le métier. |
| `src/features/<domaine>/` | Domaine métier : `screens/`, `components/`, parfois `hooks/`, `data/`, `store/`. C’est l’endroit privilégié pour les écrans Flotte E-Samba. |
| `src/components/` | UI réutilisable (design system shadcn, dashboard, mobile partagé). |
| `src/layouts/` | Coques de page (ex. `MobileLayout` sous Capacitor). |
| `src/hooks/` | Hooks React Query et utilitaires ; ils appellent **uniquement** les services. |
| `src/services/` | Logique métier, orchestration, intégrations (caméra, offline, push, deep links). **Aucun** appel Supabase direct. |
| `src/repositories/` | **Couche accès données** : tous les appels Supabase pour une entité. Distincte des services ; ne pas fusionner. |
| `src/types/` | Types partagés ; barrel [`src/types/index.ts`](../src/types/index.ts). Les types strictement locaux à une feature peuvent rester dans `features/<x>/` (ex. schémas Zod). |
| `src/mobile-app/` | Manifestes produit mobile : onglets (`routes.manifest.ts`), registre plugins natifs (`nativePlugins.registry.ts`). |
| `src/lib/` | Utilitaires transverses (plateforme, SEO, mobile shell). |

## Règle `pages/` vs `features/`

- **`pages/*`** : composant monté par une route, souvent en `lazy()`, avec peu ou pas de logique métier.
- **`features/<domaine>/screens/*`** : implémentation de l’écran et composition des composants métier ; les hooks utilisés passent par les **services**.

Les écrans **orientés mobile** (onglets, parcours terrain) vivent dans la feature du domaine concerné, pas dans un dossier `pages/mobile` isolé.

## Conventions mobile-first

Ces conventions s’appuient sur [`src/layouts/MobileLayout.tsx`](../src/layouts/MobileLayout.tsx), [`src/components/mobile/`](../src/components/mobile/) et [`src/lib/mobileOutletShellClass.ts`](../src/lib/mobileOutletShellClass.ts).

### Safe area et hauteur

- Conteneur principal : `min-h-[100dvh]` pour éviter les glitches de barre d’adresse.
- Zone scrollable : `pb-[calc(5.5rem+env(safe-area-inset-bottom))]` pour laisser la place à la barre d’onglets + encoche iOS / Android.
- Padding horizontal : `pl-[max(1rem,env(safe-area-inset-left))]` et `pr-[max(1rem,env(safe-area-inset-right))]` pour les encoches latérales.
- Classe utilitaire `pt-safe` sur le `<main>` (définie dans le thème Tailwind) pour le haut de l’écran.

### Navigation par onglets

- [`BottomTabBar`](../src/components/mobile/BottomTabBar.tsx) : fixée en bas, `pb-[max(env(safe-area-inset-bottom),0.5rem)]`, zones tactiles `min-h-[3.5rem]`, `touch-manipulation` sur les liens.
- Alignement des routes : [`MOBILE_TAB_ROUTES`](../src/mobile-app/routes.manifest.ts) et [`navigation/mobileTabs`](../src/navigation/mobileTabs.ts).

### Enveloppe visuelle par contexte

- `getMobileOutletShellClass(pathname)` applique une teinte de fond différente selon la section (accueil, flotte, alertes, opérations, compte) pour renforcer la repère utilisateur.

### Nouveaux écrans

- Préférer des listes pleine largeur, pas de dépendance à la sidebar desktop.
- Réutiliser les primitives sous `components/mobile/` ou la feature avant d’ajouter un sous-dossier `primitives/` (seulement si le volume le justifie).

## Capacitor

- Build web pour WebView : `npm run build:capacitor` (voir [`vite.config.ts`](../vite.config.ts), `base: "./"` en mode `capacitor`).
- Synchronisation des projets natifs : `npx cap sync` ou `npm run mobile:prepare` (build + sync).

Détails déploiement web et runtime Node : [deployment-e-samba-vercel.md](./deployment-e-samba-vercel.md).

## Nom produit

L’interface et la documentation utilisateur font référence à **Flotte E-Samba**. Le nom du package npm (`smart-fleet-africa`) peut rester inchangé pour la publication sur le registre.
