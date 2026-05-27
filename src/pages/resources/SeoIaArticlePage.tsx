import { Link, useParams } from "react-router-dom";
import { ResourceArticleLayout } from "@/features/resources/components/ResourceArticleLayout";
import { SeoIaScoreCalculator } from "@/features/resources/components/SeoIaScoreCalculator";
import { getSeoIaArticleBySlug } from "@/content/seo-ia/registry";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";

export default function SeoIaArticlePage() {
  const params = useParams();
  const splat = params["*"]?.replace(/\/$/, "") ?? "";
  const article = getSeoIaArticleBySlug(splat);

  if (!article) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 pt-28 pb-16 text-center">
          <h1 className="font-heading text-2xl font-bold mb-4">Article introuvable</h1>
          <Button asChild>
            <Link to="/ressources/seo-ia">Retour au hub SEO &amp; IA</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const extra =
    article.slug === "score-seo-contenu-genere-ia" ? <SeoIaScoreCalculator /> : undefined;

  return <ResourceArticleLayout article={article}>{extra}</ResourceArticleLayout>;
}
