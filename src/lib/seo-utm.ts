/** Paramètres UTM pour le hub SEO + IA (mesure GSC / analytics). */
export const SEO_IA_UTM = {
  source: "seo-ia-hub",
  medium: "content",
  campaign: "hub-seo-ia-2025",
} as const;

export function buildSeoIaCtaUrl(
  basePath: string,
  contentSlug: string,
  extra?: Record<string, string>
): string {
  const params = new URLSearchParams({
    utm_source: SEO_IA_UTM.source,
    utm_medium: SEO_IA_UTM.medium,
    utm_campaign: SEO_IA_UTM.campaign,
    utm_content: contentSlug,
    ...extra,
  });
  const path = basePath.replace(/#.*$/, "");
  return `${path}?${params.toString()}`;
}
