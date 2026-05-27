/**
 * Sélecteur de langue pour la FAQ.
 * Change la locale et propage via l'event 'faq-locale-change'.
 */

import { FAQ_LOCALES } from '@/data/faq/locales';
import { useFaqTranslations } from '@/hooks/useFaqTranslations';
import type { FaqLocale } from '@/types/faq';

interface FaqLocaleSelectorProps {
  className?: string;
}

export function FaqLocaleSelector({ className = '' }: FaqLocaleSelectorProps) {
  const { locale, setLocale } = useFaqTranslations();

  return (
    <div className={`flex items-center gap-1 ${className}`} role="group" aria-label="Langue FAQ">
      {FAQ_LOCALES.map(({ code, label, flag }) => (
        <button
          key={code}
          onClick={() => setLocale(code as FaqLocale)}
          className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs transition-colors ${
            locale === code
              ? 'bg-blue-100 text-blue-700 font-medium'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
          }`}
          aria-pressed={locale === code}
          title={label}
        >
          <span aria-hidden>{flag}</span>
          <span className="hidden sm:inline">{code.toUpperCase()}</span>
        </button>
      ))}
    </div>
  );
}
