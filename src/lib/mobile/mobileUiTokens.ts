/**
 * Classes Tailwind partagées pour les écrans rendus sous MobileLayout.
 * Hiérarchie : titre d’écran → sous-titre → sections (overlines, listes).
 */

/** Conteneur « colonne » étroite (accueil, compte, hub opérations). */
export const mobileScreenRootColumn = "mx-auto w-full max-w-lg";

/** Conteneur listes / grilles (alertes, flotte) — un peu plus large sur grand écran. */
export const mobileScreenRootList =
  "mx-auto w-full max-w-2xl lg:max-w-4xl";

/** Espacement vertical entre blocs majeurs (header, cartes, listes). */
export const mobileScreenStack = "space-y-6";

/** Espacement vertical un peu plus aéré (séparation KPI / actions). */
export const mobileScreenStackRelaxed = "space-y-7";

/** Titre principal d’écran (hors hero accueil). */
export const mobileScreenTitle =
  "font-heading text-xl font-bold tracking-tight sm:text-2xl";

/** Sous-titre sous le titre d’écran. */
export const mobileScreenSubtitle =
  "text-sm leading-relaxed text-muted-foreground";

/** Label de champ / filtre (style overline). */
export const mobileFormLabelOverline =
  "text-xs font-semibold uppercase tracking-wide text-muted-foreground";

/** Marque / contexte au-dessus du hero accueil. */
export const mobileHomeBrandOverline =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/90";

/** Titre hero tableau de bord mobile. */
export const mobileHomeHeroTitle =
  "font-heading text-[1.65rem] font-bold leading-[1.2] tracking-tight";

/** Sous-titre hero accueil (corps lisible). */
export const mobileHomeHeroSubtitle = "text-[15px] leading-relaxed text-muted-foreground";
