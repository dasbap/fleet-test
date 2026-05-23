import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, ArrowRight } from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { Skeleton } from '@/components/ui/skeleton';
import { usePageSeo } from '@/hooks/usePageSeo';
import { useSeoUseCaseIndex, useSeoUseCaseTaxonomy } from '@/hooks/useSeoUseCase';
import { SEO_ROUTE_KEYS } from '@/lib/seo';
import { ROUTE_PATHS } from '@/navigation/routePaths';

export default function UseCaseHubPage() {
  const [outilFilter, setOutilFilter] = useState('');
  const [cibleFilter, setCibleFilter] = useState('');
  const [casFilter, setCasFilter] = useState('');

  usePageSeo(SEO_ROUTE_KEYS.useCaseHub);

  const { data: items, isLoading, isError } = useSeoUseCaseIndex();
  const { data: taxonomy } = useSeoUseCaseTaxonomy();

  const outils = useMemo(
    () => taxonomy?.filter((t) => t.kind === 'outil') ?? [],
    [taxonomy]
  );
  const cibles = useMemo(
    () => taxonomy?.filter((t) => t.kind === 'cible') ?? [],
    [taxonomy]
  );
  const casUsages = useMemo(
    () => taxonomy?.filter((t) => t.kind === 'cas_usage') ?? [],
    [taxonomy]
  );

  const filtered = useMemo(() => {
    if (!items) return [];
    return items.filter((item) => {
      if (outilFilter && item.outil !== outilFilter) return false;
      if (cibleFilter && item.cible !== cibleFilter) return false;
      if (casFilter && item.cas_usage !== casFilter) return false;
      return true;
    });
  }, [items, outilFilter, cibleFilter, casFilter]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1">
        <section className="bg-gradient-to-br from-background via-background to-primary/[0.06] border-b border-border pt-28 pb-12">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
              <Layers className="w-6 h-6 text-primary" />
            </div>
            <h1 className="font-heading text-4xl font-bold mb-2">Cas d’usage E-Samba</h1>
            <p className="text-muted-foreground">
              Parcours par outil, profil métier et problème opérationnel — flotte, CEMAC et
              intégrations.
            </p>
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="flex flex-wrap gap-3 mb-8">
              <FilterSelect
                label="Outil"
                value={outilFilter}
                onChange={setOutilFilter}
                options={outils.map((o) => ({ value: o.slug, label: o.label_fr }))}
              />
              <FilterSelect
                label="Cible"
                value={cibleFilter}
                onChange={setCibleFilter}
                options={cibles.map((c) => ({ value: c.slug, label: c.label_fr }))}
              />
              <FilterSelect
                label="Cas d’usage"
                value={casFilter}
                onChange={setCasFilter}
                options={casUsages.map((c) => ({ value: c.slug, label: c.label_fr }))}
              />
            </div>

            {isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3].map((n) => (
                  <Skeleton key={n} className="h-40 rounded-2xl" />
                ))}
              </div>
            )}

            {isError && (
              <p className="text-sm text-destructive">
                Impossible de charger les cas d’usage. Réessayez plus tard.
              </p>
            )}

            {!isLoading && !isError && filtered.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun cas d’usage pour ces filtres.</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filtered.map((item) => (
                <article
                  key={item.slug}
                  className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 hover:shadow-md transition-all flex flex-col"
                >
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Tag>{item.outil_label}</Tag>
                    <Tag>{item.cible_label}</Tag>
                    <Tag>{item.cas_usage_label}</Tag>
                  </div>
                  <h2 className="font-heading font-semibold text-lg mb-2 leading-snug">
                    {item.h1}
                  </h2>
                  <p className="text-sm text-muted-foreground flex-1 mb-4">{item.intro}</p>
                  <Link
                    to={ROUTE_PATHS.useCaseDetail(item.slug)}
                    className="inline-flex items-center gap-1 text-sm text-primary font-medium hover:gap-2 transition-all"
                  >
                    Lire le guide <ArrowRight className="w-3 h-3" />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] uppercase tracking-wider font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
      {children}
    </span>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="text-sm text-muted-foreground flex flex-col gap-1">
      <span className="text-xs font-medium">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-card border border-border rounded-lg px-3 py-2 text-foreground text-sm min-w-[160px]"
      >
        <option value="">Tous</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
