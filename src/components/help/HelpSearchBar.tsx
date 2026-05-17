/**
 * Barre de recherche du centre d'aide — mobile-first, 2G-friendly.
 */

import { useRef } from 'react';
import { Search, X } from 'lucide-react';

interface HelpSearchBarProps {
  query:     string;
  onChange:  (q: string) => void;
  autoFocus?: boolean;
  className?: string;
}

export function HelpSearchBar({ query, onChange, autoFocus, className = '' }: HelpSearchBarProps) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <input
        ref={ref}
        type="search"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Rechercher un guide, tutoriel, FAQ…"
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
        className="
          w-full rounded-xl border border-border bg-background py-3 pl-10 pr-10
          text-sm placeholder:text-muted-foreground
          focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
          transition-all
        "
        aria-label="Recherche dans l'aide"
      />
      {query && (
        <button
          type="button"
          onClick={() => { onChange(''); ref.current?.focus(); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="Effacer la recherche"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
