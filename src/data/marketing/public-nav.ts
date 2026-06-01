import { ROUTE_PATHS } from "@/navigation/routePaths";

export type PublicNavLink =
  | { name: string; to: string; external?: false }
  | { name: string; href: string; external: true };

/** Liens principaux de la navbar publique (CTA uniquement — pas de menu produit). */
export const PUBLIC_NAV_LINKS: readonly PublicNavLink[] = [];

/** Liens produit du footer. */
export const FOOTER_PRODUCT_LINKS = [
  { name: "Sécurité", to: ROUTE_PATHS.securite },
] as const;

/** CTA démo navbar (ancre formulaire contact). */
export const PUBLIC_DEMO_HREF = `${ROUTE_PATHS.contact}#demo` as const;
