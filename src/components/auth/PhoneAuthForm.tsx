/**
 * Formulaire auth téléphone OTP complet.
 *
 * Étapes :
 *   1. Saisie du numéro → envoi OTP
 *   2. Saisie du code OTP → vérification
 *   3. Succès (géré par le parent via onSuccess)
 *
 * Usage :
 *   <PhoneAuthForm onSuccess={() => navigate('/dashboard')} />
 */

import { useState, useCallback } from 'react';
import { ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { usePhoneAuth } from '@/hooks/usePhoneAuth';
import { PhoneInput } from './PhoneInput';
import { OtpInput } from './OtpInput';
import { ResendTimer } from './ResendTimer';
import { formatPhoneDisplay } from '@/lib/auth/phoneFormat';
import type { AfricanCountry } from '@/types/auth-phone';

interface PhoneAuthFormProps {
  onSuccess?: () => void;
  className?: string;
}

export function PhoneAuthForm({ onSuccess, className = '' }: PhoneAuthFormProps) {
  const {
    state, sendOtp, verifyOtp, resendOtp, changePhone,
    canResend, attemptsLeft,
  } = usePhoneAuth();

  const [otpValue,      setOtpValue]      = useState('');
  const [activeCountry, setActiveCountry] = useState<AfricanCountry | null>(null);

  // Succès → callback parent
  if (state.step === 'success' && onSuccess) {
    onSuccess();
  }

  // ── Étape 1 : saisie numéro ────────────────────────────────────────────────

  const handlePhoneSubmit = useCallback(async (e164: string, country: AfricanCountry) => {
    setActiveCountry(country);
    setOtpValue('');
    await sendOtp(e164, 'sms');
  }, [sendOtp]);

  // ── Étape 2 : saisie OTP ──────────────────────────────────────────────────

  const handleOtpComplete = useCallback(async (code: string) => {
    if (code.length !== 6) return;
    await verifyOtp(code);
  }, [verifyOtp]);

  const handleResendSms       = () => resendOtp('sms');
  const handleResendWhatsApp  = () => resendOtp('whatsapp');

  // ── Affichage numéro masqué ────────────────────────────────────────────────

  const maskedPhone = activeCountry && state.phone
    ? formatPhoneDisplay(state.phone, activeCountry)
    : state.phone;

  // ── Rendu step 2 : OTP ────────────────────────────────────────────────────

  if (state.step === 'otp_sent' || state.step === 'verifying' || state.step === 'error') {
    const isVerifying = state.step === 'verifying';
    const hasError    = state.step === 'error' || (state.errorMessage !== null && state.step === 'otp_sent');

    return (
      <div className={`space-y-6 ${className}`}>
        {/* En-tête */}
        <div className="text-center space-y-1">
          <p className="text-sm text-gray-500">Code envoyé à</p>
          <p className="text-base font-semibold text-gray-900">{maskedPhone}</p>
          <button
            type="button"
            onClick={() => { changePhone(); setOtpValue(''); }}
            className="flex items-center gap-1 text-xs text-blue-600 hover:underline mx-auto mt-1"
          >
            <ArrowLeft className="h-3 w-3" aria-hidden />
            Changer de numéro
          </button>
        </div>

        {/* Saisie OTP */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 text-center">
            Entrez le code à 6 chiffres
          </label>
          <OtpInput
            value={otpValue}
            onChange={setOtpValue}
            onComplete={handleOtpComplete}
            isLoading={isVerifying}
            hasError={hasError && !!state.errorMessage}
          />
          {attemptsLeft < 3 && attemptsLeft > 0 && (
            <p className="text-xs text-amber-600 text-center">
              {attemptsLeft} tentative{attemptsLeft > 1 ? 's' : ''} restante{attemptsLeft > 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Erreur */}
        {state.errorMessage && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" aria-hidden />
            <p className="text-sm text-red-700">{state.errorMessage}</p>
          </div>
        )}

        {/* Bouton Vérifier (si OTP complet) */}
        {otpValue.length === 6 && !isVerifying && (
          <button
            type="button"
            onClick={() => handleOtpComplete(otpValue)}
            className="w-full h-11 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all"
          >
            Valider
          </button>
        )}

        {/* Renvoi */}
        <ResendTimer
          cooldownSeconds={state.cooldownSeconds}
          canResend={canResend}
          onResendSms={handleResendSms}
          onResendWhatsApp={handleResendWhatsApp}
        />
      </div>
    );
  }

  // ── Rendu step 1 : saisie numéro (idle + sending + error initial) ─────────

  return (
    <div className={`space-y-4 ${className}`}>
      <PhoneInput
        onSubmit={handlePhoneSubmit}
        isLoading={state.step === 'sending'}
      />

      {/* Erreur envoi */}
      {state.step === 'error' && state.errorMessage && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" aria-hidden />
          <p className="text-sm text-red-700">{state.errorMessage}</p>
        </div>
      )}
    </div>
  );
}
