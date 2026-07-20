/**
 * Carte tutoriel rapide — compact, expandable, 2G-friendly.
 */

import { useState } from 'react';
import { ChevronDown, Clock } from 'lucide-react';
import type { QuickTutorial } from '@/data/help/guides';

interface QuickTutorialCardProps {
  tutorial: QuickTutorial;
}

export function QuickTutorialCard({ tutorial }: QuickTutorialCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/40 transition-colors"
        aria-expanded={open}
      >
        {/* Emoji icône */}
        <span className="text-2xl shrink-0 leading-none" aria-hidden>
          {tutorial.icon}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground leading-tight">{tutorial.title}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Clock className="h-3 w-3 text-muted-foreground" aria-hidden />
            <span className="text-xs text-muted-foreground">{tutorial.duration}</span>
          </div>
        </div>

        <ChevronDown
          className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {open && (
        <div className="px-4 pb-4 pt-0">
          <p className="text-xs text-muted-foreground mb-3">{tutorial.summary}</p>
          <ol className="space-y-2">
            {tutorial.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                  {i + 1}
                </span>
                <span className="text-foreground leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
