import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOnboarding } from '@/hooks/useOnboarding';
import { StepFlotte } from '@/components/onboarding/StepFlotte';
import { StepAlertes } from '@/components/onboarding/StepAlertes';
import { StepEquipe } from '@/components/onboarding/StepEquipe';
import { StepValidation } from '@/components/onboarding/StepValidation';
import { cn } from '@/lib/utils';
import type { OnboardingData } from '@/types/onboarding';
import { toast } from '@/hooks/use-toast';
import { useTrackFunnelEvent } from '@/hooks/useFunnelTelemetry';

type StepNumber = 1 | 2 | 3 | 4;
type StepKey = keyof OnboardingData;

type StepConfig<K extends StepKey = StepKey> = {
  num: StepNumber;
  key: K;
  label: string;
  render: (params: {
    orgId: string;
    initial: OnboardingData[K] | undefined;
    onNext: (data: OnboardingData[K]) => void | Promise<void>;
    onBack?: () => void;
    onSkip: () => void | Promise<void>;
  }) => React.ReactNode;
};

const STEPS: StepConfig[] = [
  {
    num: 1,
    key: 'step1',
    label: 'Flotte',
    render: ({ orgId, initial, onNext, onSkip }) => (
      <StepFlotte orgId={orgId} initial={initial} onNext={onNext} onSkip={onSkip} />
    ),
  },
  {
    num: 2,
    key: 'step2',
    label: 'Alertes',
    render: ({ orgId, initial, onNext, onBack, onSkip }) => (
      <StepAlertes orgId={orgId} initial={initial} onNext={onNext} onBack={onBack} onSkip={onSkip} />
    ),
  },
  {
    num: 3,
    key: 'step3',
    label: 'Équipe',
    render: ({ orgId, initial, onNext, onBack, onSkip }) => (
      <StepEquipe orgId={orgId} initial={initial} onNext={onNext} onBack={onBack} onSkip={onSkip} />
    ),
  },
  {
    num: 4,
    key: 'step4',
    label: 'Validation',
    render: ({ orgId, initial, onNext, onBack, onSkip }) => (
      <StepValidation orgId={orgId} initial={initial} onNext={onNext} onBack={onBack} onSkip={onSkip} />
    ),
  },
];

export function OnboardingWizard() {
  const navigate = useNavigate();
  const { orgId } = useAuth();
  const { data: progress, saveStep, complete, isSaving, isCompleting } = useOnboarding(orgId ?? undefined);
  const { trackEvent } = useTrackFunnelEvent(orgId ?? undefined);
  const [step, setStep] = useState<StepNumber>(1);

  const maxStep = STEPS[STEPS.length - 1].num;
  const currentIndex = STEPS.findIndex(item => item.num === step);
  const currentStep = STEPS[currentIndex];

  useEffect(() => {
    if (!progress?.step) return;
    const safeStep = Math.min(Math.max(progress.step, 1), maxStep) as StepNumber;
    setStep(safeStep);
  }, [maxStep, progress?.step]);

  useEffect(() => {
    trackEvent({
      eventType: 'onboarding_step_view',
      step,
      context: { source: 'wizard' },
    });
  }, [step, trackEvent]);

  const pct = useMemo(() => Math.round((step / maxStep) * 100), [maxStep, step]);

  const goBack = () => {
    const prev = STEPS[currentIndex - 1];
    if (prev) setStep(prev.num);
  };

  const goNext = () => {
    const next = STEPS[currentIndex + 1];
    if (next) setStep(next.num);
  };

  const handleNext = async <K extends StepKey>(stepNum: StepNumber, _key: K, _data: OnboardingData[K]) => {
    trackEvent({
      eventType: 'onboarding_step_completed',
      step: stepNum,
      context: { source: 'wizard' },
    });

    if (stepNum < maxStep) {
      goNext();
      return;
    }

    try {
      await complete();
      trackEvent({
        eventType: 'onboarding_completed',
        step: 4,
        context: { source: 'wizard' },
      });
      navigate('/dashboard', { replace: true });
    } catch {
      toast({
        title: 'Erreur',
        description: "Impossible de finaliser l'onboarding pour le moment.",
        variant: 'destructive',
      });
    }
  };

  const handleSkip = async (stepNum: StepNumber) => {
    trackEvent({
      eventType: 'onboarding_step_skipped',
      step: stepNum,
      context: { source: 'wizard' },
    });

    try {
      if (stepNum < maxStep) {
        await saveStep(stepNum, {});
        goNext();
        return;
      }

      await complete();
      navigate('/dashboard', { replace: true });
    } catch {
      toast({
        title: 'Erreur',
        description: "Impossible de finaliser l'onboarding pour le moment.",
        variant: 'destructive',
      });
    }
  };

  if (!currentStep) {
    return null;
  }

  if (!orgId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-surface-overlay p-4">
      <div className="mx-auto mt-10 w-full max-w-xl rounded-card border border-surface-raised bg-surface p-8">
        <div className="mb-6 flex items-center gap-0">
          {STEPS.map((item, index) => (
            <div key={item.num} className="flex flex-1 items-center last:flex-none">
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium transition-colors',
                  step === item.num && 'border-brand bg-brand text-white',
                  step > item.num && 'border-brand bg-brand-light/20 text-brand-dark',
                  step < item.num && 'border-surface-raised bg-surface text-slate-400',
                )}
              >
                {step > item.num ? '✓' : item.num}
              </div>
              {index < STEPS.length - 1 ? (
                <div className={cn('mx-1.5 h-px flex-1 transition-colors', step > item.num ? 'bg-brand' : 'bg-surface-raised')} />
              ) : null}
            </div>
          ))}
        </div>

        <div className="mb-8 h-0.5 overflow-hidden rounded-full bg-surface-raised">
          <div className="h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>

        <div className="mb-6 rounded-md border border-brand/20 bg-brand/5 p-3">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Gain immédiat</p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            Activez votre flotte maintenant pour recevoir des alertes en temps reel et corriger une anomalie en 1 clic.
          </p>
        </div>

        {currentStep.render({
          orgId,
          initial: progress?.steps_data?.[currentStep.key],
          onNext: data => handleNext(currentStep.num, currentStep.key, data),
          onBack: currentIndex > 0 ? goBack : undefined,
          onSkip: () => handleSkip(currentStep.num),
        })}
        {isSaving ? <p className="mt-4 text-xs text-slate-500">Sauvegarde en cours...</p> : null}
        {isCompleting ? <p className="mt-2 text-xs text-slate-500">Finalisation en cours...</p> : null}
      </div>
    </div>
  );
}

export default OnboardingWiz