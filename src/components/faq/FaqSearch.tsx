/**
 * Barre de recherche FAQ — filtre les questions en temps réel.
 */

import { useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface FaqSearchProps {
  query:     string;
  onChange:  (q: string) => void;
  className?: string;
  placeholder?: string;
}

export function FaqSearch({
  query,
  onChange,
  className = '',
  placeholder = 'Rechercher…',
}: FaqSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={`relative ${className}`}>
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400"
        aria-hidden
      />
      <Input
        ref={inputRef}
        value={query}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-8 pr-8 h-8 text-sm bg-gray-50 border-gray-200 focus:bg-white"
        aria-label="Rechercher dans la FAQ"
      />
      {query && (
        <button
          onClick={() => { onChange(''); inputRef.current?.focus(); }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          aria-label="Effacer la recherche"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
