import { useState } from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { toast } from '@/hooks/use-toast';
import type { OnboardingData, OnboardingStep4Data } from '@/types/onboarding';
import { Checkbox } from '@/components/ui/checkbox';
import { OnboardingStepFooter } from '@/components/onboarding/OnboardingStepFooter';

interface StepValidationProps {
  orgId: string;
  initial?: OnboardingStep4Data;
  summary?: OnboardingData;
  onNext: (data: OnboardingStep4Data) => void | Promise<void>;
  onBack?: () => void;
  onSkip?: () => void | Promise<void>;
}

export function StepValidation({ orgId, initial, summary, onNext, onBack, onSkip }: StepValidationProps) {
  const [confirmed, setConfirmed] = useState(Boolean(initial?.confirmed));
  const { saveStep, isSaving } = useOnboarding(orgId);
  const activeAlerts = Object.entries(summary?.step2?.alerts ?? {}).filter(([, enabled]) => enabled).length;
  const invitesCount = summary?.step3?.invites?.length ?? 0;

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

      <div className="space-y-2 rounded-md border border-surface-raised p-3 text-sm text-slate-200">
        <p>
          <span className="text-slate-400">Vehicule:</span> {summary?.step1?.plate || 'Non renseigne'}
        </p>
        <p>
          <span className="text-slate-400">Alertes actives:</span> {activeAlerts}
        </p>
        <p>
          <span className="text-slate-400">Invitations preparees:</span> {invitesCount}
        </p>
      </div>

      <label className="flex items-center gap-2 rounded-md border border-surface-raised p-3">
        <Checkbox checked={confirmed} onCheckedChange={value => setConfirmed(Boolean(value))} />
        <span className="text-sm">Je confirme que la configuration initiale est correcte.</span>
      </label>

      <OnboardingStepFooter
        onBack={onBack}
        onSkip={onSkip}
        onSubmit={handleSubmit}
        submitLabel="Terminer"
        isSubmitting={isSaving}
        isSubmitDisabled={!confirmed}
      />
    </div>
  );
}
