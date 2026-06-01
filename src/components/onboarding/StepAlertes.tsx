import { useState } from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { toast } from '@/hooks/use-toast';
import type { AlertThresholdType, OnboardingStep2Data } from '@/types/onboarding';
import { Checkbox } from '@/components/ui/checkbox';
import { OnboardingStepFooter } from '@/components/onboarding/OnboardingStepFooter';
import { ROUTE_PATHS } from '@/navigation/routePaths';
import { useNavigate } from 'react-router-dom';

const DEFAULT_ALERTS: OnboardingStep2Data['alerts'] = {
  oil: true,
  revision: true,
  tires: false,
  brakes: true,
};

const ALERT_LABELS: Record<AlertThresholdType, string> = {
  oil: 'Huile',
  revision: 'Revision',
  tires: 'Pneus',
  brakes: 'Freins',
};

interface StepAlertesProps {
  orgId: string;
  initial?: OnboardingStep2Data;
  onNext: (data: OnboardingStep2Data) => void;
  onBack?: () => void;
  onSkip?: () => void;
}

export function StepAlertes({ orgId, initial, onNext, onBack, onSkip }: StepAlertesProps) {
  const navigate = useNavigate();
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
      <div>
        <h2 className="mb-1 text-lg font-medium text-slate-900 dark:text-slate-100">Activez vos alertes essentielles</h2>
        <p className="text-sm text-slate-500">
          Ces preferences sont enregistrees pour votre demarrage. Vous pourrez les ajuster en detail dans les alertes.
        </p>
      </div>

      <div className="space-y-2">
        {(Object.keys(DEFAULT_ALERTS) as AlertThresholdType[]).map((type) => (
          <label key={type} className="flex items-center justify-between rounded-md border border-surface-raised p-3">
            <span className="text-sm text-slate-100">{ALERT_LABELS[type]}</span>
            <Checkbox
              checked={alerts[type]}
              onCheckedChange={() => toggleAlert(type)}
              aria-label={`Activer l'alerte ${ALERT_LABELS[type]}`}
            />
          </label>
        ))}
      </div>

      <button
        type="button"
        onClick={() => navigate(ROUTE_PATHS.dashboardAlerts)}
        className="text-xs text-slate-400 underline hover:text-slate-300"
      >
        Ouvrir les alertes avancees
      </button>

      <div className="flex justify-end">
        <OnboardingStepFooter
          onBack={onBack}
          onSkip={onSkip}
          onSubmit={handleSubmit}
          submitLabel="Continuer"
          isSubmitting={isSaving}
        />
      </div>
    </div>
  );
}
