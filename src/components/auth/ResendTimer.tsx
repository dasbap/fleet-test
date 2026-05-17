/**
 * Timer de renvoi OTP avec option WhatsApp.
 */

import { MessageCircle, RotateCcw } from 'lucide-react';

interface ResendTimerProps {
  cooldownSeconds: number;
  canResend:       boolean;
  onResendSms:     () => void;
  onResendWhatsApp?: () => void;
  className?:      string;
}

export function ResendTimer({
  cooldownSeconds,
  canResend,
  onResendSms,
  onResendWhatsApp,
  className = '',
}: ResendTimerProps) {
  if (!canResend) {
    return (
      <p className={`text-xs text-gray-400 text-center ${className}`}>
        Renvoyer dans{' '}
        <span className="font-semibold text-gray-600 tabular-nums">
          {cooldownSeconds}s
        </span>
      </p>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={onResendSms}
        className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 hover:underline"
      >
        <RotateCcw className="h-3 w-3" aria-hidden />
        Renvoyer par SMS
      </button>

      {onResendWhatsApp && (
        <button
          type="button"
          onClick={onResendWhatsApp}
          className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 hover:underline"
        >
          <MessageCircle className="h-3 w-3" aria-hidden />
          Recevoir par WhatsApp
        </button>
      )}
    </div>
  );
}
