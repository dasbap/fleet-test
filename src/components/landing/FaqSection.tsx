import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePublicFaqEntries } from "@/hooks/useHelpArticles";
import { ROUTE_PATHS } from "@/navigation/routePaths";

function FaqItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-muted/40 transition-colors"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className="font-medium text-sm md:text-base">{q}</span>
        <ChevronDown className={cn("h-5 w-5 text-muted-foreground flex-shrink-0 transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="px-6 pb-5 text-sm text-muted-foreground leading-relaxed border-t">
          <p className="pt-4">{a}</p>
        </div>
      ) : null}
    </div>
  );
}

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { data: faqEntries = [] } = usePublicFaqEntries();
  const previewFaqs = faqEntries.slice(0, 4);

  return (
    <section id="faq" className="py-20 md:py-32 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-primary font-medium text-sm uppercase tracking-wider">FAQ</span>
          <h2 className="text-3xl md:text-4xl font-heading font-bold mt-4 mb-4">
            Questions fréquentes
          </h2>
          <p className="text-muted-foreground">
            Tout ce que vous devez savoir avant de démarrer.
          </p>
        </div>
        <div className="max-w-3xl mx-auto space-y-3">
          {previewFaqs.map((faq, i) => (
            <FaqItem
              key={faq.id}
              q={faq.title}
              a={faq.content}
              open={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </div>
        <div className="text-center mt-10 space-y-3">
          <Link
            to={ROUTE_PATHS.faq}
            className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
          >
            Voir toutes les questions
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-sm text-muted-foreground">
            Une autre question ?{" "}
            <Link to={ROUTE_PATHS.contact} className="text-primary hover:underline font-medium">
              Demandez une démo →
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
