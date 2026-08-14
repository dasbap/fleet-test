import type { Metadata } from "next";
import { getAppUrl } from "@/lib/api/billing-env";

const TITLE =
  "E-Samba.com — Logiciel de gestion de flotte en Afrique francophone";

const DESCRIPTION =
  "Gérez votre flotte de véhicules en Afrique avec E-Samba.com : suivi documents, alertes expiration, rapports, paiements MTN MoMo / Orange Money. Offres Starter, Pro et Entreprise.";

const KEYWORDS = [
  "gestion de flotte",
  "logiciel flotte Afrique",
  "fleet management Cameroun",
  "gestion véhicules CEMAC",
  "E-Samba",
  "Mobile Money flotte",
  "MTN MoMo",
  "Orange Money",
  "transport Afrique francophone",
  "Douala",
  "Yaoundé",
  "Dakar",
  "Abidjan",
] as const;

const GEO_COUNTRIES = [
  { code: "CM", name: "Cameroun" },
  { code: "SN", name: "Sénégal" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "GA", name: "Gabon" },
  { code: "CD", name: "Congo RDC" },
  { code: "BF", name: "Burkina Faso" },
] as const;

export const LANDING_PLANS = [
  {
    name: "Starter",
    priceXaf: 15000,
    maxVehicles: 5,
    maxDrivers: 10,
  },
  {
    name: "Pro",
    priceXaf: 35000,
    maxVehicles: 25,
    maxDrivers: 50,
  },
  {
    name: "Entreprise",
    priceXaf: 75000,
    maxVehicles: 100,
    maxDrivers: 200,
  },
] as const;

export function buildLandingMetadata(): Metadata {
  const appUrl = getAppUrl();

  return {
    title: TITLE,
    description: DESCRIPTION,
    keywords: [...KEYWORDS],
    alternates: {
      canonical: appUrl,
    },
    openGraph: {
      type: "website",
      locale: "fr_FR",
      url: appUrl,
      siteName: "E-Samba.com",
      title: "E-Samba.com — Gestion de flotte en Afrique",
      description:
        "La solution SaaS pensée pour les flottes africaines. Documents, alertes, rapports, Mobile Money.",
    },
    twitter: {
      card: "summary_large_image",
      title: "E-Samba.com — Gestion de flotte en Afrique",
      description: DESCRIPTION,
    },
    robots: {
      index: true,
      follow: true,
    },
    other: {
      "geo.region": "CM",
      "geo.placename": "Afrique centrale et francophone",
      "content-language": "fr",
    },
  };
}

/** Données structurées Schema.org pour SEO et ciblage géographique. */
export function buildLandingJsonLd(): object[] {
  const appUrl = getAppUrl();

  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "E-Samba.com",
      url: appUrl,
      description: DESCRIPTION,
      inLanguage: "fr",
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "E-Samba",
      url: appUrl,
      description: DESCRIPTION,
      areaServed: GEO_COUNTRIES.map((c) => ({
        "@type": "Country",
        name: c.name,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "E-Samba",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: appUrl,
      description: DESCRIPTION,
      inLanguage: "fr",
      offers: LANDING_PLANS.map((plan) => ({
        "@type": "Offer",
        name: plan.name,
        price: plan.priceXaf,
        priceCurrency: "XAF",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: plan.priceXaf,
          priceCurrency: "XAF",
          unitText: "MONTH",
        },
      })),
      areaServed: GEO_COUNTRIES.map((c) => ({
        "@type": "Country",
        name: c.name,
      })),
    },
  ];
}
