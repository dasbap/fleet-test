import * as React from "react";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

export interface SearchBarProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  onClear?: () => void;
}

/**
 * Champ recherche mobile : icône, annulation tactile, pas de look input desktop étroit.
 */
export const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(
  ({ className, value, onClear, placeholder = "Rechercher…", ...props }, ref) => {
    const hasValue = value !== undefined && value !== "";

    return (
      <div
        className={cn(
          "relative flex min-h-11 items-center rounded-xl border border-border/90 bg-muted/30",
          "focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/30",
          className,
        )}
      >
        <Search
          className="pointer-events-none absolute left-3.5 h-[18px] w-[18px] text-muted-foreground"
          aria-hidden
        />
        <input
          ref={ref}
          type="search"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          placeholder={placeholder}
          value={value}
          className={cn(
            "min-h-11 w-full rounded-xl bg-transparent py-2.5 pl-10 pr-10 text-base text-foreground placeholder:text-muted-foreground",
            "focus:outline-none",
          )}
          {...props}
        />
        {hasValue && onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-1.5 flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground touch-manipulation hover:bg-muted/80 hover:text-foreground active:bg-muted"
            aria-label="Effacer la recherche"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        ) : null}
      </div>
    );
  },
);
SearchBar.displayName = "SearchBar";
