/**
 * Formulaire connexion email/mot de passe — version compacte pour HybridAuthPage.
 * La page AuthPage.tsx (features/auth) reste la référence pour l'inscription complète.
 */

import { useState, useCallback } from 'react';
import { Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface EmailAuthFormProps {
  onLogin:     (email: string, password: string) => Promise<void>;
  isLoading?:  boolean;
  errorMessage?: string | null;
  className?:  string;
}

export function EmailAuthForm({
  onLogin,
  isLoading  = false,
  errorMessage,
  className  = '',
}: EmailAuthFormProps) {
  const [email,         setEmail]         = useState('');
  const [password,      setPassword]      = useState('');
  const [showPassword,  setShowPassword]  = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    await onLogin(email.trim().toLowerCase(), password);
  }, [email, password, onLogin]);

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      {/* Email */}
      <div className="space-y-1.5">
        <label htmlFor="hybrid-email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
          <Input
            id="hybrid-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@exemple.com"
            className="pl-9 h-10"
            autoComplete="username"
            disabled={isLoading}
            required
          />
        </div>
      </div>

      {/* Mot de passe */}
      <div className="space-y-1.5">
        <label htmlFor="hybrid-password" className="block text-sm font-medium text-gray-700">
          Mot de passe
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
          <Input
            id="hybrid-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="pl-9 pr-10 h-10"
            autoComplete="current-password"
            disabled={isLoading}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
            aria-label={showPassword ? 'Masquer' : 'Afficher'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Erreur */}
      {errorMessage && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" aria-hidden />
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || !email.trim() || !password}
        className="w-full h-11 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <span className="animate-spin h-4 w-4 border-2 border-white/40 border-t-white rounded-full" />
        ) : (
          'Se connecter'
        )}
      </button>
    </form>
  );
}
