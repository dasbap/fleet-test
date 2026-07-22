/**
 * Page de connexion hybride E-Samba.
 *
 * Méthodes disponibles :
 *   - Téléphone OTP (défaut, recommandé zone CEMAC)
 *   - Email + mot de passe (fallback admin / hors couverture SMS)
 *   - Magic link email (prévu — non encore activé)
 *
 * Layout :
 *   - Mobile : plein écran, onglets Phone/Email
 *   - Desktop : deux colonnes (branding gauche, formulaire droite)
 */

import { useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Truck, Smartphone, Mail, Sparkles } from 'lucide-react';
import { useHybridAuth } from '@/hooks/useHybridAuth';
import { PhoneAuthForm } from './PhoneAuthForm';
import { EmailAuthForm } from './EmailAuthForm';
import { ROUTE_PATHS } from '@/navigation/routePaths';
import {
  getSafePostLoginPath,
  POST_LOGIN_NEXT_PARAM,
  LEGACY_POST_LOGIN_REDIRECT_PARAM,
} from '@/navigation/postLoginRedirect';
import type { AuthMethod } from '@/types/auth-phone';

// ─── Types locaux ──────────────────────────────────────────────────────────────

interface TabConfig {
  id:    AuthMethod;
  label: string;
  icon:  React.ReactNode;
}

const TABS: TabConfig[] = [
  { id: 'phone', label: 'Téléphone', icon: <Smartphone className="h-4 w-4" aria-hidden /> },
  { id: 'email', label: 'Email',     icon: <Mail        className="h-4 w-4" aria-hidden /> },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HybridAuthPage() {
  const navigate        = useNavigate();
  const [searchParams]  = useSearchParams();

  const redirectTo =
    getSafePostLoginPath(searchParams.get(POST_LOGIN_NEXT_PARAM)) ??
    getSafePostLoginPath(searchParams.get(LEGACY_POST_LOGIN_REDIRECT_PARAM)) ??
    ROUTE_PATHS.dashboard;

  const {
    method,
    setMethod,
    emailLogin,
    emailLoading,
    emailError,
    clearEmailError,
  } = useHybridAuth(redirectTo);

  const handleEmailLogin = useCallback(async (email: string, password: string) => {
    clearEmailError();
    await emailLogin({ email, password });
  }, [emailLogin, clearEmailError]);

  const handlePhoneSuccess = useCallback(() => {
    navigate(redirectTo, { replace: true });
  }, [navigate, redirectTo]);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background pt-safe pb-safe lg:flex-row">

      {/* ── Colonne branding (desktop uniquement) ── */}
      <div className="hidden lg:flex flex-col justify-between w-2/5 max-w-lg bg-primary/5 border-r border-border/50 p-12 shrink-0">
        <div className="flex items-center gap-3">
          <Truck className="h-8 w-8 text-primary" aria-hidden />
          <span className="font-heading text-xl font-semibold">E-Samba</span>
        </div>

        <div className="space-y-6">
          <blockquote className="text-2xl font-heading font-medium leading-relaxed text-foreground">
            « Gérez votre flotte intelligemment,
            <br />
            où que vous soyez en Afrique Centrale. »
          </blockquote>
          <ul className="space-y-3 text-sm text-muted-foreground">
            {[
              'Suivi temps réel des véhicules',
              'Alertes automatiques (SMS + WhatsApp)',
              'Facturation en XAF / FCFA',
              'Conformité transit CEMAC',
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">© 2026 E-Samba · Douala, Cameroun</p>
      </div>

      {/* ── Colonne formulaire ── */}
      <div className="flex flex-1 flex-col justify-center px-4 py-8 sm:px-8 lg:px-16">
        <div className="mx-auto w-full max-w-md">

          {/* Retour */}
          <Link
            to={ROUTE_PATHS.home}
            className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Retour à l'accueil
          </Link>

          {/* Logo mobile */}
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Truck className="h-6 w-6 text-primary-foreground" aria-hidden />
            </div>
            <span className="font-heading text-xl font-bold">E-Samba</span>
          </div>

          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            Connexion
          </h1>
          <p className="mt-1.5 text-[15px] text-muted-foreground">
            Accédez à votre tableau de bord de flotte
          </p>

          {/* Onglets */}
          <div role="tablist" aria-label="Méthode de connexion" className="mt-6 flex rounded-xl border border-border bg-muted/40 p-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMethod(tab.id)}
                role="tab"
                aria-selected={method === tab.id}
                className={`
                  flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all
                  ${method === tab.id
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'}
                `}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Formulaire actif */}
          <div className="mt-6">
            {method === 'phone' ? (
              <PhoneAuthForm onSuccess={handlePhoneSuccess} />
            ) : (
              <EmailAuthForm
                onLogin={handleEmailLogin}
                isLoading={emailLoading}
                errorMessage={emailError}
              />
            )}
          </div>

          {/* Lien magic link futur */}
          {method === 'email' && (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              <Sparkles className="inline h-3 w-3 mr-1 text-amber-500" aria-hidden />
              Connexion sans mot de passe (lien magique) — bientôt disponible
            </p>
          )}

          {/* Séparateur */}
          <div className="mt-8 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>Pas encore de compte ?</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Link
            to={ROUTE_PATHS.contact}
            className="mt-3 flex w-full items-center justify-center rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            Demander un acces E-Samba
          </Link>
        </div>
      </div>
    </div>
  );
}
