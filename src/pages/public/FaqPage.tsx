import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { PublicPageLayout } from "@/components/landing/PublicPageLayout";
import { PublicPageHero } from "@/components/landing/PublicPageHero";
import { FaqSchemaOrg } from "@/components/faq/FaqSchemaOrg";
import { FaqQuestionForm } from "@/components/faq/FaqQuestionForm";
import { FaqSearch } from "@/components/faq/FaqSearch";
import { usePublicFaqEntries } from "@/hooks/useHelpArticles";
import { usePageSeo } from "@/hooks/usePageSeo";
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
  const { data: faqEntries = [] } = usePublicFaqEntries();
  const schemaItems = faqEntries.map((entry) => ({
    id: entry.id,
    question: entry.title,
    answer: entry.content,
  }));

  const filteredFaqs = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return faqEntries;
    return faqEntries.filter(
      (faq) =>
        faq.title.toLowerCase().includes(normalized) ||
        faq.content.toLowerCase().includes(normalized),
    );
  }, [faqEntries, query]);

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
              Aucun résultat pour "{query.trim()}". Posez votre question ci-dessous.
            </p>
          ) : (
            <div className="space-y-3 animate-fade-in-up">
              {filteredFaqs.map((faq) => {
                const originalIndex = faqEntries.findIndex((entry) => entry.id === faq.id);
                return (
                  <FaqAccordionItem
                    key={faq.id}
                    q={faq.title}
                    a={faq.content}
                    open={openIndex === originalIndex}
                    onToggle={() =>
                      setOpenIndex(openIndex === originalIndex ? null : originalIndex)
                    }
                  />
                );
              })}
            </div>
          )}

          <div className="mt-10">
            <FaqQuestionForm />
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
}
