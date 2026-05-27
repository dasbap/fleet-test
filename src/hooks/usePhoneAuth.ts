/**
 * Hook auth téléphone OTP — flux complet.
 *
 * États : idle → sending → otp_sent → verifying → success / error
 * Cooldown 60s entre envois, max 5 tentatives de vérification.
 *
 * Usage :
 *   const { state, sendOtp, verifyOtp, resendOtp, changePhone } = usePhoneAuth();
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { PhoneAuthState, OtpSendResult, OtpVerifyResult } from '@/types/auth-phone';

const COOLDOWN_SECONDS  = 60;
const MAX_VERIFY_ATTEMPTS = 5;
const OTP_EDGE_URL      = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/otp-send`;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePhoneAuth() {
  const [state, setState] = useState<PhoneAuthState>({
    step:            'idle',
    phone:           '',
    errorMessage:    null,
    cooldownSeconds: 0,
    verifyAttempts:  0,
    sendCount:       0,
    channel:         'sms',
  });

  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Nettoyage de l'intervalle au démontage
  useEffect(() => () => {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
  }, []);

  // ── Démarrer le cooldown ────────────────────────────────────────────────────

  const startCooldown = useCallback((seconds: number) => {
    if (cooldownRef.current) clearInterval(cooldownRef.current);

    setState((s) => ({ ...s, cooldownSeconds: seconds }));

    cooldownRef.current = setInterval(() => {
      setState((s) => {
        if (s.cooldownSeconds <= 1) {
          clearInterval(cooldownRef.current!);
          cooldownRef.current = null;
          return { ...s, cooldownSeconds: 0 };
        }
        return { ...s, cooldownSeconds: s.cooldownSeconds - 1 };
      });
    }, 1000);
  }, []);

  // ── Envoyer OTP ─────────────────────────────────────────────────────────────

  const sendOtp = useCallback(async (
    phone: string,
    channel: 'sms' | 'whatsapp' = 'sms',
  ): Promise<OtpSendResult> => {
    setState((s) => ({
      ...s,
      step:         'sending',
      phone,
      channel,
      errorMessage: null,
    }));

    try {
      const res = await fetch(OTP_EDGE_URL, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'apikey':        import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ phone, channel }),
      });

      const data = await res.json() as {
        ok: boolean; reason?: string; message?: string; retryAfter?: number;
      };

      if (!data.ok) {
        setState((s) => ({
          ...s,
          step:         'error',
          errorMessage: data.message ?? 'Erreur lors de l\'envoi du code.',
        }));

        if (data.reason === 'rate_limited') {
          startCooldown(data.retryAfter ?? COOLDOWN_SECONDS);
        }

        return {
          ok:      false,
          reason:  data.reason as OtpSendResult['reason'],
          message: data.message,
          retryAfter: data.retryAfter,
        };
      }

      setState((s) => ({
        ...s,
        step:      'otp_sent',
        sendCount: s.sendCount + 1,
        errorMessage: null,
      }));

      startCooldown(COOLDOWN_SECONDS);
      return { ok: true };

    } catch (err) {
      const message = 'Connexion impossible. Vérifiez votre connexion internet.';
      setState((s) => ({ ...s, step: 'error', errorMessage: message }));
      return { ok: false, reason: 'unknown', message };
    }
  }, [startCooldown]);

  // ── Vérifier OTP ────────────────────────────────────────────────────────────

  const verifyOtp = useCallback(async (token: string): Promise<OtpVerifyResult> => {
    if (state.verifyAttempts >= MAX_VERIFY_ATTEMPTS) {
      const message = 'Trop de tentatives incorrectes. Demandez un nouveau code.';
      setState((s) => ({ ...s, step: 'error', errorMessage: message }));
      return { ok: false, reason: 'too_many_attempts', message };
    }

    setState((s) => ({ ...s, step: 'verifying', errorMessage: null }));

    const { error } = await supabase.auth.verifyOtp({
      phone: state.phone,
      token,
      type:  'sms',
    });

    if (error) {
      const isExpired  = error.message?.toLowerCase().includes('expir');
      const isInvalid  = error.message?.toLowerCase().includes('invalid');

      const message = isExpired
        ? 'Le code a expiré. Demandez un nouveau code.'
        : isInvalid
        ? 'Code incorrect. Vérifiez le code reçu.'
        : 'Vérification échouée. Réessayez.';

      const reason: OtpVerifyResult['reason'] = isExpired
        ? 'expired_otp'
        : isInvalid
        ? 'invalid_otp'
        : 'unknown';

      setState((s) => ({
        ...s,
        step:           'otp_sent', // Reste sur la saisie OTP pour réessai
        errorMessage:   message,
        verifyAttempts: s.verifyAttempts + 1,
      }));

      return { ok: false, reason, message };
    }

    setState((s) => ({ ...s, step: 'success', errorMessage: null }));
    return { ok: true };
  }, [state.phone, state.verifyAttempts]);

  // ── Renvoyer OTP ────────────────────────────────────────────────────────────

  const resendOtp = useCallback(async (channel?: 'sms' | 'whatsapp') => {
    if (state.cooldownSeconds > 0) return;
    return sendOtp(state.phone, channel ?? state.channel);
  }, [state.phone, state.channel, state.cooldownSeconds, sendOtp]);

  // ── Changer de numéro ────────────────────────────────────────────────────────

  const changePhone = useCallback(() => {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    setState({
      step:            'idle',
      phone:           '',
      errorMessage:    null,
      cooldownSeconds: 0,
      verifyAttempts:  0,
      sendCount:       0,
      channel:         'sms',
    });
  }, []);

  const canResend = state.cooldownSeconds === 0 && state.step === 'otp_sent';
  const attemptsLeft = MAX_VERIFY_ATTEMPTS - state.verifyAttempts;

  return { state, sendOtp, verifyOtp, resendOtp, changePhone, canResend, attemptsLeft };
}
