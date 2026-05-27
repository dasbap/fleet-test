import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { SimpleMarkdown } from '@/components/content/SimpleMarkdown';
import { UseCaseSchemaOrg } from '@/components/seo/UseCaseSchemaOrg';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePageSeo } from '@/hooks/usePageSeo';
import { useSeoUseCase, seoUseCaseService } from '@/hooks/useSeoUseCase';
import { SEO_ROUTE_KEYS } from '@/lib/seo';
import { ROUTE_PATHS } from '@/navigation/routePaths';
import NotFound from '@/pages/NotFound';

export default function UseCaseDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: page, isLoading, isError } = useSeoUseCase(slug);

  const canonicalPath = slug ? seoUseCaseService.getCanonicalPath(slug) : ROUTE_PATHS.useCaseHub;

  usePageSeo(SEO_ROUTE_KEYS.notFound, {
    title: page?.title ?? 'Cas d’usage | E-Samba',
    description: page?.meta_description ?? 'Guide E-Samba pour la gestion de flotte.',
    canonicalPath,
  });

  if (!slug || (!isLoading && !page && !isError)) {
    return <NotFound />;
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 pt-28 pb-16 max-w-3xl">
          <p className="text-destructive text-sm">
            Impossible de charger cette page. Réessayez plus tard.
          </p>
          <Button variant="link" asChild className="mt-4 px-0">
            <Link to={ROUTE_PATHS.useCaseHub}>Retour aux cas d’usage</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {page && <UseCaseSchemaOrg page={page} />}
      <Navbar />

      <main className="flex-1">
        <section className="border-b border-border pt-28 pb-10">
          <div className="container mx-auto px-4 max-w-3xl">
            <Link
              to={ROUTE_PATHS.useCaseHub}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Tous les cas d’usage
            </Link>

            {isLoading && (
              <>
                <Skeleton className="h-10 w-full mb-4" />
                <Skeleton className="h-4 w-2/3 mb-8" />
                <Skeleton className="h-32 w-full" />
              </>
            )}

            {page && (
              <>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge>{page.outil_label}</Badge>
                  <Badge>{page.cible_label}</Badge>
                  <Badge>{page.cas_usage_label}</Badge>
                </div>
                <h1 className="font-heading text-3xl md:text-4xl font-bold mb-4">{page.h1}</h1>
                <p className="text-lg text-muted-foreground leading-relaxed">{page.intro}</p>
              </>
            )}
          </div>
        </section>

        {page && (
          <section className="py-12">
            <div className="container mx-auto px-4 max-w-3xl">
              <SimpleMarkdown source={page.body_md} />
              <div className="mt-12 p-6 rounded-2xl border border-border bg-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="font-heading font-semibold text-foreground">
                    Prêt à tester sur votre flotte ?
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Déployez E-Samba avec un parcours guidé adapté à votre profil.
                  </p>
                </div>
                <Button asChild>
                  <Link to={page.cta_href}>
                    {page.cta_label}
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap gap-4 text-sm">
                <Link to={ROUTE_PATHS.pricing} className="text-primary hover:underline">
                  Tarifs
                </Link>
                <Link to="/blog" className="text-primary hover:underline">
                  Blog
                </Link>
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] uppercase tracking-wider font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
      {children}
    </span>
  );
}
