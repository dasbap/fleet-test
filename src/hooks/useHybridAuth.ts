/**
 * Hook auth hybride — téléphone OTP + email/password.
 *
 * Unifie les deux méthodes dans une seule interface.
 * Téléphone recommandé par défaut pour les utilisateurs Afrique.
 * Email réservé aux admins/devs (mais accessible à tous).
 *
 * Usage :
 *   const { method, setMethod, phoneAuth, emailLogin } = useHybridAuth();
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { usePhoneAuth } from './usePhoneAuth';
import type { AuthMethod } from '@/types/auth-phone';

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface EmailLoginParams {
  email:    string;
  password: string;
}

interface EmailLoginResult {
  ok:      boolean;
  message?: string;
}

export function useHybridAuth(redirectTo = '/dashboard') {
  const navigate = useNavigate();

  const [method,     setMethod]     = useState<AuthMethod>('phone');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError,   setEmailError]   = useState<string | null>(null);

  const phoneAuth = usePhoneAuth();

  // Rediriger après succès téléphone
  const { state: phoneState } = phoneAuth;
  if (phoneState.step === 'success') {
    navigate(redirectTo, { replace: true });
  }

  // ── Login email/password ─────────────────────────────────────────────────────

  const emailLogin = useCallback(async (params: EmailLoginParams): Promise<EmailLoginResult> => {
    setEmailLoading(true);
    setEmailError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email:    params.email.trim().toLowerCase(),
      password: params.password,
    });

    setEmailLoading(false);

    if (error) {
      const message =
        error.message?.includes('Invalid login credentials')
          ? 'Email ou mot de passe incorrect.'
          : error.message?.includes('Email not confirmed')
          ? 'Confirmez votre email avant de vous connecter.'
          : 'Connexion impossible. Réessayez.';

      setEmailError(message);
      return { ok: false, message };
    }

    navigate(redirectTo, { replace: true });
    return { ok: true };
  }, [navigate, redirectTo]);

  // ── Magic link (futur) ───────────────────────────────────────────────────────

  const sendMagicLink = useCallback(async (email: string): Promise<{ ok: boolean; message?: string }> => {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}${redirectTo}` },
    });

    if (error) {
      return { ok: false, message: 'Impossible d\'envoyer le lien. Réessayez.' };
    }
    return { ok: true };
  }, [redirectTo]);

  return {
    method,
    setMethod,
    phoneAuth,
    emailLogin,
    emailLoading,
    emailError,
    clearEmailError: () => setEmailError(null),
    sendMagicLink,
  };
}
