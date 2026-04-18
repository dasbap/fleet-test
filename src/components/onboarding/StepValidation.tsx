import { useState } from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { toast } from '@/hooks/use-toast';
import type { OnboardingStep4Data } from '@/types/onboarding';

interface StepValidationProps {
  orgId: string;
  initial?: OnboardingStep4Data;
  onNext: (data: OnboardingStep4Data) => void | Promise<void>;
  onBack?: () => void;
  onSkip?: () => void | Promise<void>;
}

export function StepValidation({ orgId, initial, onNext, onBack, onSkip }: StepValidationProps) {
  const [confirmed, setConfirmed] = useState(Boolean(initial?.confirmed));
  const { saveStep, isSaving } = useOnboarding(orgId);

  const handleSubmit = async () => {
    if (!confirmed || isSaving) return;

    try {
      const payload: OnboardingStep4Data = { confirmed: true };
      await saveStep(4, { step4: payload });
      await onNext(payload);
    } catch {
      toast({
        title: 'Erreur',
        description: "Impossible de valider l'onboarding pour le moment.",
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="mb-1 text-lg font-medium text-slate-900 dark:text-slate-100">Validation finale</h2>
        <p className="text-sm text-slate-500">Confirmez vos informations pour terminer la configuration.</p>
      </div>

      <label className="flex items-center gap-2 rounded-md border border-surface-raised p-3">
        <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
        <span className="text-sm">Je confirme que la configuration initiale est correcte.</span>
      </label>

      <div className="flex gap-2">
        {onBack ? (
          <button type="button" onClick={onBack} className="rounded-md border px-3 py-2">
            Retour
          </button>
        ) : null}
        {onSkip ? (
          <button type="button" onClick={onSkip} className="rounded-md border px-3 py-2">
            Passer
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!confirmed || isSaving}
          className="rounded-md bg-primary px-3 py-2 text-primary-foreground disabled:opacity-60"
        >
          Terminer
        </button>
      </div>
    </div>
  );
}
