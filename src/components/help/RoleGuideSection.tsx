/**
 * Section guides détaillés filtrée par rôle.
 * Accordéon avec étapes numérotées — optimisé 2G.
 */

import { useState } from 'react';
import { ChevronDown, Clock, BookOpen } from 'lucide-react';
import { GUIDES, type Guide, type GuideRole } from '@/data/help/guides';

// ── Carte guide ───────────────────────────────────────────────────────────────

function GuideCard({ guide }: { guide: Guide }) {
  const [open, setOpen] = useState(false);

  const categoryColors: Record<string, string> = {
    démarrage: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
    quotidien: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    urgence:   'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
    avancé:    'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
        aria-expanded={open}
      >
        <BookOpen className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${categoryColors[guide.category] ?? ''}`}>
              {guide.category}
            </span>
          </div>
          <p className="text-sm font-medium text-foreground leading-tight">{guide.title}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Clock className="h-3 w-3 text-muted-foreground" aria-hidden />
            <span className="text-xs text-muted-foreground">{guide.duration}</span>
          </div>
        </div>

        <ChevronDown
          className={`h-4 w-4 text-muted-foreground shrink-0 mt-0.5 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {open && (
        <div className="px-4 pb-4 pt-0 border-t border-border/50">
          <p className="text-xs text-muted-foreground mt-3 mb-4 leading-relaxed">{guide.summary}</p>
          <div className="space-y-4">
            {guide.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">{step.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
          {/* Tags */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {guide.tags.map((tag) => (
              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section filtrée par rôle ──────────────────────────────────────────────────

interface RoleGuideSectionProps {
  role:      GuideRole;
  className?: string;
}

export function RoleGuideSection({ role, className = '' }: RoleGuideSectionProps) {
  const guides = GUIDES.filter((g) => g.role === role);

  if (guides.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      {guides.map((g) => (
        <GuideCard key={g.id} guide={g} />
      ))}
    </div>
  );
}
