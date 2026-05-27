/**
 * Champ de saisie numéro de téléphone avec sélecteur de pays CEMAC.
 * Formate automatiquement en E164 à la soumission.
 */

import { useState, useRef, useCallback } from 'react';
import { ChevronDown, Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AFRICAN_COUNTRIES, DEFAULT_COUNTRY, toE164, validatePhone } from '@/lib/auth/phoneFormat';
import type { AfricanCountry } from '@/types/auth-phone';

interface PhoneInputProps {
  onSubmit:   (e164: string, country: AfricanCountry) => void;
  isLoading?: boolean;
  className?: string;
}

export function PhoneInput({ onSubmit, isLoading = false, className = '' }: PhoneInputProps) {
  const [country,     setCountry]     = useState<AfricanCountry>(DEFAULT_COUNTRY);
  const [rawValue,    setRawValue]    = useState('');
  const [showPicker,  setShowPicker]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCountrySelect = useCallback((c: AfricanCountry) => {
    setCountry(c);
    setShowPicker(false);
    setRawValue('');
    setError(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Accepter chiffres, espaces et tirets uniquement
    const val = e.target.value.replace(/[^\d\s-]/g, '');
    setRawValue(val);
    setError(null);
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    const e164 = toE164(rawValue, country);
    if (!e164) {
      setError(`Format invalide. Ex: ${country.mobilePrefixes[0]}2 345 678`);
      return;
    }

    const validation = validatePhone(e164, country);
    if (!validation.valid) {
      setError(validation.error ?? 'Numéro invalide.');
      return;
    }

    onSubmit(e164, country);
  }, [rawValue, country, onSubmit]);

  const placeholder = `${country.mobilePrefixes[0]}X XXX XXXX`;

  return (
    <form onSubmit={handleSubmit} className={`space-y-3 ${className}`}>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Numéro de téléphone
        </label>

        <div className="flex gap-2">
          {/* Sélecteur pays */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPicker((v) => !v)}
              className="flex items-center gap-1.5 h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm font-medium hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
              aria-label="Changer de pays"
              aria-expanded={showPicker}
            >
              <span className="text-base">{country.flag}</span>
              <span className="text-gray-700">{country.dialCode}</span>
              <ChevronDown className="h-3.5 w-3.5 text-gray-400" aria-hidden />
            </button>

            {/* Dropdown pays */}
            {showPicker && (
              <div className="absolute left-0 top-full mt-1 w-56 rounded-xl border border-gray-200 bg-white shadow-lg z-50 overflow-hidden">
                {AFRICAN_COUNTRIES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleCountrySelect(c)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-gray-50 ${
                      c.code === country.code ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                    }`}
                  >
                    <span className="text-base shrink-0">{c.flag}</span>
                    <span className="flex-1 text-left">{c.name}</span>
                    <span className="text-gray-400 text-xs">{c.dialCode}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Champ numéro */}
          <div className="relative flex-1">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden />
            <Input
              ref={inputRef}
              type="tel"
              value={rawValue}
              onChange={handleChange}
              placeholder={placeholder}
              className={`pl-9 h-10 tracking-wider ${error ? 'border-red-400 focus:ring-red-400' : ''}`}
              inputMode="numeric"
              autoComplete="tel-national"
              disabled={isLoading}
              aria-describedby={error ? 'phone-error' : undefined}
              aria-invalid={!!error}
            />
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <p id="phone-error" className="mt-1.5 text-xs text-red-600" role="alert">
            {error}
          </p>
        )}

        {/* Hint opérateurs */}
        <p className="mt-1.5 text-xs text-gray-400">
          {country.operators.join(' · ')}
        </p>
      </div>

      <button
        type="submit"
        disabled={isLoading || !rawValue.trim()}
        className="w-full h-11 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <span className="animate-spin h-4 w-4 border-2 border-white/40 border-t-white rounded-full" />
        ) : (
          'Recevoir le code'
        )}
      </button>
    </form>
  );
}
