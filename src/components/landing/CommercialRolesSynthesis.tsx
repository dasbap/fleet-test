import { Link } from "react-router-dom";
import { ArrowRight, Lightbulb, MapPin, Users } from "lucide-react";
import {
  CARRIERES_COMMERCIAL_POSTE_A,
  CARRIERES_COMMERCIAL_POSTE_B,
  CARRIERES_COMMERCIAL_RECOMMENDATION_HIGHLIGHT,
  CARRIERES_COMMERCIAL_SYNTHESIS_ROWS,
} from "@/data/marketing/carrieres-commercial-synthese";
import { ROUTE_PATHS } from "@/navigation/routePaths";

function PosteCompareCard({
  label,
  tagline,
  values,
}: {
  label: string;
  tagline: string;
  values: readonly { criterion: string; value: string }[];
}) {
  return (
    <article className="flex h-full flex-col rounded-xl border border-border bg-background/80 p-4 md:p-5">
      <div className="mb-4 border-b border-border pb-3">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">
          {tagline}
        </p>
        <h4 className="font-heading text-base font-semibold text-foreground">{label}</h4>
      </div>
      <dl className="flex-1 space-y-3">
        {values.map(({ criterion, value }) => (
          <div
            key={criterion}
            className="grid grid-cols-[minmax(7rem,38%)_1fr] gap-x-3 gap-y-0.5 text-sm"
          >
            <dt className="font-medium text-foreground">{criterion}</dt>
            <dd className="text-muted-foreground">{value}</dd>
          </div>
        ))}
      </dl>
      <Link
        to={ROUTE_PATHS.contact}
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-primary transition-all hover:gap-2"
      >
        Envoyer mon CV pour acceder a la fiche
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
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
          Yaounde
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">
          <Users className="h-3 w-3" aria-hidden />
          3 postes ouverts
        </span>
        <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">
          Recrutement immediat
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <PosteCompareCard
          label={CARRIERES_COMMERCIAL_POSTE_A.label}
          tagline={CARRIERES_COMMERCIAL_POSTE_A.tagline}
          values={posteAValues}
        />
        <PosteCompareCard
          label={CARRIERES_COMMERCIAL_POSTE_B.label}
          tagline={CARRIERES_COMMERCIAL_POSTE_B.tagline}
          values={posteBValues}
        />
      </div>

      <div
        className="flex gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3"
        role="note"
      >
        <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        <div className="text-sm">
          <p className="font-medium text-foreground">
            {CARRIERES_COMMERCIAL_RECOMMENDATION_HIGHLIGHT}
          </p>
        </div>
      </div>
    </div>
  );
}
