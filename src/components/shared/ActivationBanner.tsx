import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useActivation, type ActivationStep } from "@/hooks/useActivation";

function IconX({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 3l10 10M13 3L3 13" />
    </svg>
  );
}

function IconArrow({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

function StepDot({ step, isCurrent }: { step: ActivationStep; isCurrent: boolean }) {
  return (
    <div
      title={step.label}
      aria-label={`${step.label} - ${step.completed ? "complete" : isCurrent ? "en cours" : "a faire"}`}
      className={cn(
        "h-2 w-2 flex-shrink-0 rounded-full transition-all duration-300",
        step.completed
          ? "bg-brand scale-100"
          : isCurrent
            ? "bg-brand/40 scale-125 ring-2 ring-brand/30"
            : "bg-slate-300 dark:bg-slate-600",
      )}
    />
  );
}

export function ActivationBanner() {
  const navigate = useNavigate();
  const { steps, completedCount, totalCount, percentage, isAllDone, loading, isBannerVisible, dismissBanner } =
    useActivation();
  const nextStep = steps.find((step) => !step.completed);

  if (loading || isAllDone || !isBannerVisible || !nextStep) return null;

  return (
    <div
      role="complementary"
      aria-label="Progression de votre activation"
      className="sticky top-16 z-20 border-b border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-surface"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5">
        <div className="flex flex-shrink-0 items-center gap-2">
          <span className="tabular-nums text-xs font-semibold text-slate-500 dark:text-slate-400">
            {completedCount}/{totalCount}
          </span>
          <div className="flex items-center gap-1">
            {steps.map((step) => (
              <StepDot key={step.id} step={step} isCurrent={step.id === nextStep.id} />
            ))}
          </div>
        </div>

        <div
          className="h-1.5 max-w-[120px] flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${percentage}% complete`}
        >
          <div
            className="h-full rounded-full bg-brand transition-all duration-700 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">Prochaine etape</p>
          <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
            {nextStep.icon} {nextStep.label}
          </p>
        </div>

        <span className="hidden flex-shrink-0 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-medium text-brand md:inline-flex dark:text-brand-light">
          {nextStep.impact}
        </span>

        <button
          type="button"
          onClick={() => navigate(nextStep.href)}
          className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white transition-colors duration-150 hover:bg-brand-dark"
        >
          <span className="hidden sm:inline">{nextStep.cta}</span>
          <span className="sm:hidden">Commencer</span>
          <IconArrow className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          aria-label="Masquer ce bandeau"
          onClick={dismissBanner}
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        >
          <IconX className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
