import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { PublicPageLayout } from "@/components/landing/PublicPageLayout";
import { PublicPageHero } from "@/components/landing/PublicPageHero";
import { PublicCtaSection } from "@/components/landing/PublicCtaSection";
import { FaqSchemaOrg } from "@/components/faq/FaqSchemaOrg";
import { FaqSearch } from "@/components/faq/FaqSearch";
import { PUBLIC_FAQ_ENTRIES, toPublicFaqItems } from "@/data/marketing/faq-public";
import { usePageSeo } from "@/hooks/usePageSeo";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { cn } from "@/lib/utils";

function FaqAccordionItem({
  q,
  a,
  open,
  onToggle,
}: {
  q: string;
  a: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-muted/40 transition-colors"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className="font-medium text-sm md:text-base">{q}</span>
        <ChevronDown
          className={cn(
            "h-5 w-5 text-muted-foreground flex-shrink-0 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div className="px-6 pb-5 text-sm md:text-base text-muted-foreground leading-relaxed border-t">
          <p className="pt-4">{a}</p>
        </div>
      ) : null}
    </div>
  );
}

export default function FaqPage() {
  usePageSeo("faq");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const schemaItems = toPublicFaqItems();

  const filteredFaqs = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return PUBLIC_FAQ_ENTRIES;
    return PUBLIC_FAQ_ENTRIES.filter(
      (faq) =>
        faq.q.toLowerCase().includes(normalized) ||
        faq.a.toLowerCase().includes(normalized),
    );
  }, [query]);

  return (
    <PublicPageLayout>
      <FaqSchemaOrg items={schemaItems} />
      <PublicPageHero
        eyebrow="FAQ"
        title="Questions fréquentes"
        description="Tout ce que vous devez savoir avant de démarrer avec E-Samba."
      />

      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4 max-w-3xl">
          <FaqSearch query={query} onChange={setQuery} className="mb-8" />

          {filteredFaqs.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm md:text-base py-8">
              Aucun résultat pour « {query.trim()} ».{" "}
              <Link to={ROUTE_PATHS.contact} className="text-primary hover:underline">
                Contactez-nous
              </Link>
            </p>
          ) : (
            <div className="space-y-3 animate-fade-in-up">
              {filteredFaqs.map((faq) => {
                const originalIndex = PUBLIC_FAQ_ENTRIES.indexOf(faq);
                return (
                  <FaqAccordionItem
                    key={faq.q}
                    q={faq.q}
                    a={faq.a}
                    open={openIndex === originalIndex}
                    onToggle={() =>
                      setOpenIndex(openIndex === originalIndex ? null : originalIndex)
                    }
                  />
                );
              })}
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground mt-10">
            Une autre question ?{" "}
            <Link to={ROUTE_PATHS.contact} className="text-primary hover:underline font-medium">
              Contactez-nous →
            </Link>
          </p>
        </div>
      </section>

      <PublicCtaSection />
    </PublicPageLayout>
  );
}
