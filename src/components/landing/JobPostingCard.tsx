import type { ReactNode } from "react";
import { ChevronDown, Lock, Mail, MapPin, Clock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildJobCvMailtoHref } from "@/lib/carrieres-detail-access";
import type { JobPosting, JobTargetTable } from "@/types/carrieres";

interface JobPostingCardProps {
  posting: JobPosting;
  open: boolean;
  unlocked: boolean;
  onToggle: () => void;
  onCvSendIntent: () => void;
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h4 className="font-semibold text-sm text-foreground mb-2">{title}</h4>
      {children}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
          <span className="text-primary font-bold shrink-0">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function TargetTable({ table }: { table: JobTargetTable }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{table.title}</p>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[28rem] text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              {table.headers.map((header) => (
                <th
                  key={header}
                  scope="col"
                  className="px-3 py-2 text-left font-semibold text-foreground"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-border last:border-0">
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="px-3 py-2 text-muted-foreground align-top"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function JobPostingCard({
  posting,
  open,
  unlocked,
  onToggle,
  onCvSendIntent,
}: JobPostingCardProps) {
  const mailtoHref = buildJobCvMailtoHref(posting);

  const handleCvClick = () => {
    onCvSendIntent();
  };

  const handleToggleDetail = () => {
    if (!unlocked) return;
    onToggle();
  };

  return (
    <article
      id={posting.id}
      className="relative scroll-mt-28 bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 transition-colors"
    >
      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
          <h3 className="font-heading font-semibold text-base pr-4">{posting.title}</h3>
          <div className="flex flex-wrap gap-2 shrink-0">
            {posting.headcountLabel ? (
              <span className="text-xs font-semibold text-foreground bg-muted px-2.5 py-0.5 rounded-full">
                {posting.headcountLabel}
              </span>
            ) : null}
            <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
              {posting.contract}
            </span>
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
              {posting.availabilityLabel}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 mb-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" aria-hidden />
            {posting.location}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" aria-hidden />
            Temps plein
          </span>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed mb-5">{posting.mission}</p>

        <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 mb-4">
          <p className="text-sm text-foreground font-medium mb-1">
            Étape 1 — Envoyer votre CV
          </p>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            Ouvrez votre messagerie, joignez votre CV et envoyez l&apos;e-mail. Le message
            contient le lien d&apos;accès à la fiche détaillée du poste.
          </p>
          <a
            href={mailtoHref}
            onClick={handleCvClick}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors text-sm"
          >
            <Mail className="w-4 h-4" aria-hidden />
            Envoyer mon CV par e-mail
          </a>
        </div>

        {unlocked ? (
          <button
            type="button"
            className="w-full flex items-center justify-between text-left pt-2 border-t border-border"
            onClick={handleToggleDetail}
            aria-expanded={open}
            aria-controls={`${posting.id}-detail`}
          >
            <span className="text-xs text-primary font-medium">
              {open ? "Masquer la fiche détaillée" : "Voir la fiche détaillée"}
            </span>
            <ChevronDown
              className={cn(
                "h-5 w-5 text-muted-foreground transition-transform duration-200",
                open && "rotate-180",
              )}
              aria-hidden
            />
          </button>
        ) : (
          <div
            className="flex items-start gap-2 pt-2 border-t border-border text-xs text-muted-foreground"
            role="status"
          >
            <Lock className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
            <p>
              La fiche détaillée se débloque après l&apos;envoi de votre CV (lien inclus dans
              l&apos;e-mail) ou via le lien reçu de l&apos;équipe RH.
            </p>
          </div>
        )}
      </div>

      {unlocked && open ? (
        <div
          id={`${posting.id}-detail`}
          className="px-6 pb-6 space-y-5 border-t border-border pt-5"
        >
          <DetailSection title="Mission principale">
            <p className="text-sm text-muted-foreground leading-relaxed">{posting.mission}</p>
          </DetailSection>

          <DetailSection title="Contexte et enjeux">
            <p className="text-sm text-muted-foreground leading-relaxed">{posting.context}</p>
          </DetailSection>

          {posting.targetTables && posting.targetTables.length > 0 ? (
            <DetailSection title="Cibles prioritaires">
              <div className="space-y-4">
                {posting.targetTables.map((table) => (
                  <TargetTable key={table.title} table={table} />
                ))}
              </div>
            </DetailSection>
          ) : null}

          <DetailSection title="Responsabilités">
            <div className="space-y-3">
              {posting.responsibilities.map(({ domain, detail }) => (
                <div key={domain} className="text-sm">
                  <p className="font-medium text-foreground">{domain}</p>
                  <p className="text-muted-foreground mt-0.5">{detail}</p>
                </div>
              ))}
            </div>
          </DetailSection>

          {posting.schedule && posting.schedule.length > 0 ? (
            <DetailSection title="Journée type">
              <div className="space-y-2">
                {posting.schedule.map(({ time, activity }) => (
                  <div
                    key={time}
                    className="flex flex-col sm:flex-row sm:gap-4 text-sm border-b border-border/60 pb-2 last:border-0 last:pb-0"
                  >
                    <span className="font-medium text-foreground shrink-0 sm:w-36">{time}</span>
                    <span className="text-muted-foreground">{activity}</span>
                  </div>
                ))}
              </div>
            </DetailSection>
          ) : null}

          <DetailSection title="Compétences requises">
            <BulletList items={posting.skills} />
          </DetailSection>

          {posting.generalSkills.length > 0 ? (
            <DetailSection title="Compétences générales">
              <BulletList items={posting.generalSkills} />
            </DetailSection>
          ) : null}

          {posting.education.length > 0 ? (
            <DetailSection title="Formation et expérience">
              <BulletList items={posting.education} />
            </DetailSection>
          ) : null}

          {posting.languages && posting.languages.length > 0 ? (
            <DetailSection title="Langues">
              <BulletList items={posting.languages} />
            </DetailSection>
          ) : null}

          <DetailSection title="Conditions">
            <BulletList items={posting.conditions} />
          </DetailSection>

          {posting.kpis.length > 0 ? (
            <DetailSection title="KPIs du poste">
              <BulletList items={posting.kpis} />
            </DetailSection>
          ) : null}

          <DetailSection title="Évolution">
            <p className="text-sm text-muted-foreground">{posting.evolution}</p>
          </DetailSection>

          <a
            href={mailtoHref}
            onClick={handleCvClick}
            className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:gap-2 transition-all"
          >
            Envoyer mon CV <ArrowRight className="w-4 h-4" aria-hidden />
          </a>
        </div>
      ) : null}
    </article>
  );
}
