/**
 * Barre de recherche FAQ — filtre les questions en temps réel.
 */

import { useRef } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FaqSearchProps {
  query: string;
  onChange: (q: string) => void;
  className?: string;
  placeholder?: string;
}

export function FaqSearch({
  query,
  onChange,
  className = "",
  placeholder = "Rechercher dans la FAQ…",
}: FaqSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={cn("relative", className)}>
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
        aria-hidden
      />
      <Input
        ref={inputRef}
        value={query}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-9 h-10 text-sm md:text-base bg-muted/50 border-border focus:bg-background"
        aria-label="Rechercher dans la FAQ"
      />
      {query ? (
        <button
          type="button"
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="Effacer la recherche"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
