import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useActivation } from "@/hooks/useActivation";
import type { ActivationStepId } from "@/hooks/useActivation";

function FleetIllustration() {
  return (
    <svg
      viewBox="0 0 240 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mx-auto h-32 w-48"
      role="img"
      aria-label="Illustration d'une flotte de véhicules"
    >
      <rect x="0" y="110" width="240" height="50" rx="0" fill="#f1f5f9" />
      <rect x="0" y="108" width="240" height="4" rx="2" fill="#e2e8f0" />
      <rect x="20" y="130" width="30" height="4" rx="2" fill="#cbd5e1" />
      <rect x="70" y="130" width="30" height="4" rx="2" fill="#cbd5e1" />
      <rect x="120" y="130" width="30" height="4" rx="2" fill="#cbd5e1" />
      <rect x="170" y="130" width="30" height="4" rx="2" fill="#cbd5e1" />

      <rect x="80" y="72" width="80" height="40" rx="8" fill="#10b981" />
      <rect x="92" y="60" width="56" height="20" rx="6" fill="#059669" />
      <rect x="96" y="63" width="20" height="14" rx="3" fill="#a7f3d0" opacity="0.8" />
      <rect x="120" y="63" width="24" height="14" rx="3" fill="#a7f3d0" opacity="0.8" />
      <circle cx="100" cy="112" r="10" fill="#334155" />
      <circle cx="100" cy="112" r="5" fill="#64748b" />
      <circle cx="140" cy="112" r="10" fill="#334155" />
      <circle cx="140" cy="112" r="5" fill="#64748b" />
      <rect x="155" y="82" width="8" height="6" rx="2" fill="#fef08a" />
      <rect x="77" y="82" width="8" height="6" rx="2" fill="#fef08a" />

      <rect x="10" y="84" width="55" height="28" rx="6" fill="#94a3b8" />
      <rect x="18" y="75" width="39" height="14" rx="4" fill="#64748b" />
      <circle cx="26" cy="112" r="8" fill="#334155" />
      <circle cx="26" cy="112" r="4" fill="#64748b" />
      <circle cx="55" cy="112" r="8" fill="#334155" />
      <circle cx="55" cy="112" r="4" fill="#64748b" />

      <rect x="175" y="84" width="55" height="28" rx="6" fill="#94a3b8" />
      <rect x="183" y="75" width="39" height="14" rx="4" fill="#64748b" />
      <circle cx="191" cy="112" r="8" fill="#334155" />
      <circle cx="191" cy="112" r="4" fill="#64748b" />
      <circle cx="220" cy="112" r="8" fill="#334155" />
      <circle cx="220" cy="112" r="4" fill="#64748b" />

      <rect x="8" y="8" width="52" height="30" rx="6" fill="white" stroke="#e2e8f0" strokeWidth="1" />
      <rect x="12" y="13" width="16" height="4" rx="2" fill="#10b981" />
      <rect x="12" y="20" width="28" height="3" rx="1.5" fill="#e2e8f0" />
      <rect x="12" y="26" width="22" height="3" rx="1.5" fill="#e2e8f0" />

      <rect x="94" y="4" width="52" height="30" rx="6" fill="white" stroke="#e2e8f0" strokeWidth="1" />
      <rect x="98" y="9" width="20" height="4" rx="2" fill="#3b82f6" />
      <rect x="98" y="16" width="30" height="3" rx="1.5" fill="#e2e8f0" />
      <rect x="98" y="22" width="24" height="3" rx="1.5" fill="#e2e8f0" />

      <rect x="180" y="8" width="52" height="30" rx="6" fill="white" stroke="#e2e8f0" strokeWidth="1" />
      <rect x="184" y="13" width="14" height="4" rx="2" fill="#f59e0b" />
      <rect x="184" y="20" width="26" height="3" rx="1.5" fill="#e2e8f0" />
      <rect x="184" y="26" width="20" height="3" rx="1.5" fill="#e2e8f0" />
    </svg>
  );
}

interface QuickWinProps {
  icon: string;
  title: string;
  description: string;
  cta: string;
  href: string;
  stepId: ActivationStepId;
  completed: boolean;
  timeLabel: string;
  onComplete: (id: ActivationStepId) => void;
  index: number;
}

function QuickWinCard({
  icon,
  title,
  description,
  cta,
  href,
  stepId: _stepId,
  completed,
  timeLabel,
  onComplete: _onComplete,
  index,
}: QuickWinProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(href);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={completed}
      aria-label={completed ? `${title} — complété` : `${title} — ${timeLabel}`}
      className={cn(
        "group relative w-full rounded-xl border p-4 text-left transition-all duration-200",
        completed ? "cursor-default border-brand/30 bg-brand/5" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-surface",
        !completed && "hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-sm",
      )}
    >
      <div
        className={cn(
          "absolute -left-2.5 -top-2.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold dark:border-surface-overlay",
          completed ? "bg-brand text-white" : "bg-slate-100 text-slate-400 dark:bg-slate-800",
        )}
      >
        {completed ? "✓" : index + 1}
      </div>

      <div className={cn("mb-3 text-2xl transition-transform duration-200", !completed && "group-hover:scale-110")}>
        {completed ? "✅" : icon}
      </div>

      <h3
        className={cn(
          "mb-1 text-sm font-semibold",
          completed
            ? "text-brand decoration-brand/40 line-through dark:text-brand-light"
            : "text-slate-800 dark:text-slate-100",
        )}
      >
        {title}
      </h3>

      <p className="mb-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>

      {!completed ? (
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400">⏱ {timeLabel}</span>
          <span className="text-xs font-medium text-brand group-hover:underline dark:text-brand-light">{cta} →</span>
        </div>
      ) : null}
    </button>
  );
}

function getContextualMessage(daysSinceSignup: number, completedCount: number) {
  if (completedCount > 0) {
    return {
      title: "Continuez sur votre lancée !",
      subtitle: `Vous avez déjà accompli ${completedCount} étape${completedCount > 1 ? "s" : ""}. Plus que quelques actions pour tirer le meilleur d'E-Samba.`,
    };
  }
  if (daysSinceSignup === 0) {
    return {
      title: "Bienvenue dans E-Samba 👋",
      subtitle: "Votre tableau de bord est prêt. Commencez par ajouter votre premier véhicule — ça prend 2 minutes.",
    };
  }
  if (daysSinceSignup <= 2) {
    return {
      title: "Votre flotte vous attend",
      subtitle: "Vous vous êtes inscrit il y a peu. Ajoutez votre premier véhicule pour voir vos KPIs prendre vie.",
    };
  }
  return {
    title: "Reprenez là où vous en étiez",
    subtitle: "Votre tableau de bord sera rempli de données dès votre premier créneau ouvert. C'est le moment.",
  };
}

export interface EmptyStateDashboardProps {
  daysSinceSignup?: number;
  className?: string;
}

export function EmptyStateDashboard({ daysSinceSignup = 0, className }: EmptyStateDashboardProps) {
  const { steps, completedCount, completeStep } = useActivation();

  const { title, subtitle } = getContextualMessage(daysSinceSignup, completedCount);
  const quickWins = steps.filter((step) => !step.completed).slice(0, 3);

  const STEP_DURATIONS: Record<ActivationStepId, string> = {
    first_vehicle: "2 min",
    first_creneau: "1 min",
    first_alert: "30 sec",
    invite_member: "1 min",
    first_report: "30 sec",
  };

  return (
    <div className={cn("flex flex-col items-center px-4 py-12", className)}>
      <div className="mb-6 animate-[float_4s_ease-in-out_infinite]">
        <FleetIllustration />
      </div>

      <div className="mb-8 max-w-lg text-center">
        <h2 className="mb-2 font-heading text-xl font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
        <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>

      {quickWins.length > 0 ? (
        <div className="mb-8 w-full max-w-2xl">
          <p className="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            3 actions pour démarrer
          </p>
          <div
            className={cn(
              "grid gap-4",
              quickWins.length === 1
                ? "mx-auto max-w-xs grid-cols-1"
                : quickWins.length === 2
                  ? "grid-cols-2"
                  : "grid-cols-1 sm:grid-cols-3",
            )}
          >
            {quickWins.map((step, index) => (
              <QuickWinCard
                key={step.id}
                icon={step.icon}
                title={step.label}
                description={step.description}
                cta={step.cta}
                href={step.href}
                stepId={step.id}
                completed={step.completed}
                timeLabel={STEP_DURATIONS[step.id]}
                onComplete={completeStep}
                index={index}
              />
            ))}
          </div>
        </div>
      ) : null}

      <PrimaryCtaButton steps={steps} completedCount={completedCount} />

      <p className="mt-6 max-w-sm text-center text-xs text-slate-400 dark:text-slate-600">
        Des gestionnaires de flotte en Afrique Centrale font confiance à E-Samba pour suivre leurs véhicules au quotidien.
      </p>
    </div>
  );
}

function PrimaryCtaButton({
  steps,
}: {
  steps: ReturnType<typeof useActivation>["steps"];
  completedCount: number;
}) {
  const navigate = useNavigate();
  const nextStep = steps.find((step) => !step.completed);

  if (!nextStep) {
    return (
      <div className="flex items-center gap-2 text-sm font-medium text-brand">
        <span>🎉</span>
        <span>Activation complète — votre flotte est opérationnelle !</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => navigate(nextStep.href)}
      className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-medium text-white shadow-lg shadow-brand/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-brand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <span>{nextStep.icon}</span>
      <span>{nextStep.cta}</span>
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path d="M3 8h10M9 4l4 4-4 4" />
      </svg>
    </button>
  );
}
