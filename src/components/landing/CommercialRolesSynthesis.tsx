import { ArrowDown, Lightbulb, MapPin, Users } from "lucide-react";
import {
  CARRIERES_COMMERCIAL_POSTE_A,
  CARRIERES_COMMERCIAL_POSTE_B,
  CARRIERES_COMMERCIAL_RECOMMENDATION_HIGHLIGHT,
  CARRIERES_COMMERCIAL_SYNTHESIS_ROWS,
} from "@/data/marketing/carrieres-commercial-synthese";

function PosteCompareCard({
  label,
  tagline,
  anchorId,
  values,
}: {
  label: string;
  tagline: string;
  anchorId: string;
  values: readonly { criterion: string; value: string }[];
}) {
  return (
    <article className="flex flex-col rounded-xl border border-border bg-background/80 p-4 md:p-5 h-full">
      <div className="mb-4 pb-3 border-b border-border">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">{tagline}</p>
        <h4 className="font-heading font-semibold text-base text-foreground">{label}</h4>
      </div>
      <dl className="space-y-3 flex-1">
        {values.map(({ criterion, value }) => (
          <div key={criterion} className="grid grid-cols-[minmax(7rem,38%)_1fr] gap-x-3 gap-y-0.5 text-sm">
            <dt className="font-medium text-foreground">{criterion}</dt>
            <dd className="text-muted-foreground">{value}</dd>
          </div>
        ))}
      </dl>
      <a
        href={`#${anchorId}`}
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:gap-2 transition-all"
      >
        Envoyer mon CV pour accéder à la fiche
        <ArrowDown className="h-3.5 w-3.5" aria-hidden />
      </a>
    </article>
  );
}

export function CommercialRolesSynthesis() {
  const posteAValues = CARRIERES_COMMERCIAL_SYNTHESIS_ROWS.map((row) => ({
    criterion: row.criterion,
    value: row.posteA,
  }));
  const posteBValues = CARRIERES_COMMERCIAL_SYNTHESIS_ROWS.map((row) => ({
    criterion: row.criterion,
    value: row.posteB,
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
          <MapPin className="h-3 w-3" aria-hidden />
          Yaoundé
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">
          <Users className="h-3 w-3" aria-hidden />
          3 postes ouverts
        </span>
        <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">
          Recrutement immédiat
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PosteCompareCard
          label={CARRIERES_COMMERCIAL_POSTE_A.label}
          tagline={CARRIERES_COMMERCIAL_POSTE_A.tagline}
          anchorId={CARRIERES_COMMERCIAL_POSTE_A.id}
          values={posteAValues}
        />
        <PosteCompareCard
          label={CARRIERES_COMMERCIAL_POSTE_B.label}
          tagline={CARRIERES_COMMERCIAL_POSTE_B.tagline}
          anchorId={CARRIERES_COMMERCIAL_POSTE_B.id}
          values={posteBValues}
        />
      </div>

      <div
        className="flex gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3"
        role="note"
      >
        <Lightbulb className="h-5 w-5 shrink-0 text-primary mt-0.5" aria-hidden />
        <div className="text-sm">
          <p className="font-medium text-foreground">{CARRIERES_COMMERCIAL_RECOMMENDATION_HIGHLIGHT}</p>
        </div>
      </div>
    </div>
  );
}
