import { ROUTE_PATHS } from "@/navigation/routePaths";

export type PublicNavLink =
  | { name: string; to: string; external?: false }
  | { name: string; href: string; external: true };

/** Liens principaux de la navbar publique (sans Guides — hub marketing externe). */
export const PUBLIC_NAV_LINKS: readonly PublicNavLink[] = [
  { name: "Fonctionnalités", to: ROUTE_PATHS.fonctionnalites },
  { name: "Modules", to: ROUTE_PATHS.modules },
  { name: "Tarifs", to: ROUTE_PATHS.pricing },
  { name: "FAQ", to: ROUTE_PATHS.faq },
  { name: "Contact", to: ROUTE_PATHS.contact },
];

/** Liens produit du footer. */
export const FOOTER_PRODUCT_LINKS = [
  { name: "Fonctionnalités", to: ROUTE_PATHS.fonctionnalites },
  { name: "Modules", to: ROUTE_PATHS.modules },
  { name: "Tarifs", to: ROUTE_PATHS.pricing },
  { name: "Sécurité", to: ROUTE_PATHS.securite },
] as const;

/** CTA démo navbar (ancre formulaire contact). */
export const PUBLIC_DEMO_HREF = `${ROUTE_PATHS.contact}#demo` as const;
