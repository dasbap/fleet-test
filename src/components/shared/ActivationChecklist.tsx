import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useActivation } from "@/hooks/useActivation";

interface ActivationChecklistProps {
  mode?: "sidebar" | "card" | "inline";
  className?: string;
}

export function ActivationChecklist({ mode = "inline", className }: ActivationChecklistProps) {
  const navigate = useNavigate();
  const { loading, steps, completedCount, totalCount } = useActivation();

  if (loading) {
    return <div className={cn("p-4 space-y-3 animate-pulse rounded-xl border border-slate-700", className)} />;
  }

  const containerClass =
    mode === "card"
      ? "rounded-card border border-surface-raised bg-surface p-4"
      : mode === "sidebar"
        ? "rounded-2xl border border-slate-800 bg-surface p-3"
        : "rounded-card border border-dashed border-surface-raised bg-surface/50 p-4";

  return (
    <aside className={cn(containerClass, className)} aria-label="Checklist d'activation">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-200">Checklist d'activation</p>
        <span className="text-xs font-medium text-brand-light">
          {completedCount}/{totalCount}
        </span>
      </div>
      <div className="space-y-2">
        {steps.map((step) => (
          <button
            key={step.id}
            type="button"
            onClick={() => navigate(step.href)}
            className={cn(
              "flex w-full items-start gap-2 rounded-md px-2 py-2 text-left transition-colors",
              step.completed ? "bg-brand/10" : "hover:bg-slate-800/40",
            )}
          >
            <span
              className={cn(
                "mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[11px]",
                step.completed ? "bg-brand text-white" : "border border-surface-raised text-slate-300",
              )}
            >
              {step.completed ? "ok" : "."}
            </span>
            <span className="min-w-0">
              <span className={cn("block text-sm", step.completed ? "text-slate-400 line-through" : "text-slate-100")}>
                {step.label}
              </span>
              <span className="block text-xs text-slate-400">{step.cta}</span>
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}
