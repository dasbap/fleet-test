import { useState } from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { toast } from '@/hooks/use-toast';
import type { AlertThresholdType, OnboardingStep2Data } from '@/types/onboarding';

const DEFAULT_ALERTS: OnboardingStep2Data['alerts'] = {
  oil: true,
  revision: true,
  tires: false,
  brakes: true,
};

interface StepAlertesProps {
  orgId: string;
  initial?: OnboardingStep2Data;
  onNext: (data: OnboardingStep2Data) => void;
  onBack?: () => void;
  onSkip?: () => void;
}

export function StepAlertes({ orgId, initial, onNext, onBack, onSkip }: StepAlertesProps) {
  const [alerts, setAlerts] = useState<OnboardingStep2Data['alerts']>(initial?.alerts ?? DEFAULT_ALERTS);
  const { saveStep, isSaving } = useOnboarding(orgId);

  const toggleAlert = (type: AlertThresholdType) => {
    setAlerts((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const handleSubmit = async () => {
    try {
      await saveStep(2, { step2: { alerts } });
      onNext({ alerts });
    } catch {
      toast({
        title: 'Erreur',
        description: "Impossible de sauvegarder l'étape des alertes pour le moment.",
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {(Object.keys(DEFAULT_ALERTS) as AlertThresholdType[]).map((type) => (
          <label key={type} className="flex items-center justify-between rounded-md border p-3">
            <span className="capitalize">{type}</span>
            <input
              type="checkbox"
              checked={alerts[type]}
              onChange={() => toggleAlert(type)}
              aria-label={`Activer l'alerte ${type}`}
            />
          </label>
        ))}
      </div>

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
          disabled={isSaving}
          className="rounded-md bg-primary px-3 py-2 text-primary-foreground disabled:opacity-60"
        >
          Continuer
        </button>
      </div>
    </div>
  );
}
