# Design system E-Samba (web + Capacitor)

Ce dossier documente les **tokens** et conventions UI partagés entre le dashboard web et la WebView mobile Capacitor.

## Tokens (source de vérité)

| Fichier | Contenu |
|---------|---------|
| [`src/index.css`](../src/index.css) | Variables CSS (`--primary`, `--background`, safe-area, etc.) |
| [`tailwind.config.ts`](../tailwind.config.ts) | Mapping Tailwind → tokens HSL |

Règles :

- Ne pas utiliser de couleurs Tailwind en dur (`green-500`) dans les features.
- Préférer `primary`, `muted`, `destructive`, `card`, `border`.
- Safe area : classes `.pt-safe`, `.pb-safe`, `env(safe-area-inset-*)` dans les shells mobile.

## Composants de base

- **shadcn/ui** : `@/components/ui/*`
- **Mobile** : `@/components/mobile/BottomTabBar`, `ScreenContainer`, `@/layouts/MobileAppShell`
- **Tutoriels** : `@/features/tutorials/components/*` (cartes, lecteur, skeletons)

## Espacements mobile

- Gouttières : `px-4` + `pl-[max(1rem,env(safe-area-inset-left))]`
- Tab bar : `pb-[calc(5.5rem+env(safe-area-inset-bottom))]` sur le `main` scrollable

## Typographie

- Titres de page : `text-xl font-semibold`
- Sous-titres : `text-sm text-muted-foreground`
- Labels onglets mobile : `text-[11px] font-semibold`

## Tutoriels vidéo

- **Storage** : vignettes `thumbs/tuto-NN.svg` (requis) ; vidéos `videos/tuto-NN.mp4` (optionnel, probe avant lecture)
- Liste : grille `grid-cols-1 sm:grid-cols-2`
- Lecteur : `aspect-video`, `playsInline` sur `<video>` ; sinon `TutorialVideoPending`
- États : skeleton (`TutorialsListSkeleton`), erreur (`TutorialErrorBoundary`), retry / actualiser
- Ops : `npm run upload:tutorial-thumbs`, `npm run verify:tutorials-storage`
