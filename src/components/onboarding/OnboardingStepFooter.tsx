import { cn } from '@/lib/utils';

interface OnboardingStepFooterProps {
  onBack?: () => void;
  onSkip?: () => void;
  onSubmit: () => void;
  submitLabel: string;
  isSubmitting?: boolean;
  isSubmitDisabled?: boolean;
  className?: string;
}

export function OnboardingStepFooter({
  onBack,
  onSkip,
  onSubmit,
  submitLabel,
  isSubmitting = false,
  isSubmitDisabled = false,
  className,
}: OnboardingStepFooterProps) {
  return (
    <div className={cn('mt-8 flex flex-wrap items-center gap-2', className)}>
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="rounded-md border border-surface-raised bg-surface px-4 py-2 text-sm font-medium text-slate-100 transition-colors hover:bg-surface-raised"
        >
          Retour
        </button>
      ) : null}

      {onSkip ? (
        <button
          type="button"
          onClick={onSkip}
          className="rounded-md border border-surface-raised bg-surface px-4 py-2 text-sm font-medium text-slate-100 transition-colors hover:bg-surface-raised"
        >
          Passer
        </button>
      ) : null}

      <button
        type="button"
        onClick={onSubmit}
        disabled={isSubmitDisabled || isSubmitting}
        className="rounded-md bg-brand px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isSubmitting ? 'Enregistrement...' : submitLabel}
      </button>
    </div>
  );
}
