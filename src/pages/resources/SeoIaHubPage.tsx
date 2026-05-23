import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { FaqSchemaOrg } from "@/components/faq/FaqSchemaOrg";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSeoIaHubCards, SEO_IA_PILLAR_SLUGS } from "@/content/seo-ia/registry";
import { HUB_FAQ } from "@/content/seo-ia/shared";
import { usePageSeo } from "@/hooks/usePageSeo";
import { SEO_ROUTE_KEYS } from "@/lib/seo";

const HUB_TITLE = "Hub SEO & IA | Guides contenu généré | E-Samba";
const HUB_DESCRIPTION =
  "Optimisation contenu IA pour le SEO : piliers, briefs, prompts, score qualité et production B2B à l'échelle.";

export default function SeoIaHubPage() {
  usePageSeo(SEO_ROUTE_KEYS.notFound, {
    title: HUB_TITLE,
    description: HUB_DESCRIPTION,
    canonicalPath: "/ressources/seo-ia",
  });

  const cards = getSeoIaHubCards();
  const pillars = cards.filter((c) => SEO_IA_PILLAR_SLUGS.includes(c.slug));
  const clusters = cards.filter((c) => !SEO_IA_PILLAR_SLUGS.includes(c.slug) && c.kind !== "modele");
  const modeles = cards.filter((c) => c.kind === "modele");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <FaqSchemaOrg items={HUB_FAQ} />
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <h1 className="font-heading text-4xl font-bold mb-2">Hub SEO &amp; intelligence artificielle</h1>
          <p className="text-muted-foreground mb-4 max-w-2xl">{HUB_DESCRIPTION}</p>
          <p className="text-sm text-muted-foreground mb-10">
            <Link to="/ressources" className="text-primary hover:underline">
              Ressources
            </Link>
            {" / SEO & IA"}
          </p>

          <section className="mb-12" aria-labelledby="pillars-heading">
            <h2 id="pillars-heading" className="font-heading text-2xl font-semibold mb-6">
              Guides piliers
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              {pillars.map((card) => (
                <Link key={card.slug} to={`/ressources/seo-ia/${card.slug}`}>
                  <Card className="h-full hover:border-primary/40 transition-colors">
                    <CardHeader>
                      <CardTitle className="text-base">{card.title}</CardTitle>
                      <CardDescription className="line-clamp-3">{card.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </section>

          <section className="mb-12" aria-labelledby="clusters-heading">
            <h2 id="clusters-heading" className="font-heading text-2xl font-semibold mb-6">
              Articles thématiques
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {clusters.map((card) => (
                <Link key={card.slug} to={`/ressources/seo-ia/${card.slug}`}>
                  <Card className="h-full hover:border-primary/40 transition-colors">
                    <CardHeader>
                      <CardTitle className="text-base">{card.title}</CardTitle>
                      <CardDescription className="line-clamp-2">{card.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </section>

          <section className="mb-12" aria-labelledby="modeles-heading">
            <h2 id="modeles-heading" className="font-heading text-2xl font-semibold mb-6">
              Modèles de brief
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              {modeles.map((card) => (
                <Link key={card.slug} to={`/ressources/seo-ia/${card.slug}`}>
                  <Card className="h-full hover:border-primary/40 transition-colors">
                    <CardHeader>
                      <CardTitle className="text-base">{card.title}</CardTitle>
                      <CardDescription className="line-clamp-2">{card.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </section>

          <section id="faq" className="border-t border-border pt-10" aria-labelledby="hub-faq-heading">
            <h2 id="hub-faq-heading" className="font-heading text-2xl font-semibold mb-6">
              FAQ
            </h2>
            <dl className="space-y-6">
              {HUB_FAQ.map((item) => (
                <div key={item.id}>
                  <dt className="font-medium mb-2">{item.question}</dt>
                  <dd className="text-sm text-muted-foreground">{item.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
