import { Link } from "react-router-dom";
import { BookOpen, Sparkles } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePageSeo } from "@/hooks/usePageSeo";
import { SEO_ROUTE_KEYS } from "@/lib/seo";
import { RESOURCES_INDEX_META } from "@/lib/seo-resources";

export default function ResourcesIndexPage() {
  usePageSeo(SEO_ROUTE_KEYS.notFound, {
    title: RESOURCES_INDEX_META.title,
    description: RESOURCES_INDEX_META.description,
    canonicalPath: "/ressources",
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <h1 className="font-heading text-4xl font-bold mb-2">Ressources E-Samba</h1>
          <p className="text-muted-foreground mb-10 max-w-2xl">
            Guides sur les opérations B2B, la gestion de flotte et la production de contenu assistée par IA.
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader>
                <Sparkles className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Hub SEO &amp; IA</CardTitle>
                <CardDescription>
                  Optimisation de contenu généré, prompts, briefs automatisés et production à l&apos;échelle.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/ressources/seo-ia" className="text-sm text-primary font-medium hover:underline">
                  Explorer le hub →
                </Link>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Blog flotte</CardTitle>
                <CardDescription>
                  Actualités produit, CEMAC et bonnes pratiques transport.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/blog" className="text-sm text-primary font-medium hover:underline">
                  Voir le blog →
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
