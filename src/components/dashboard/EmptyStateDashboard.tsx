import { useState } from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateDashboardProps {
  onAddVehicle: () => void;
  onConfigureAlerts: () => void;
  onInviteTeam: () => void;
  onDemoData?: () => void;
  userName?: string;
}

interface ActivationStep {
  label: string;
  done: boolean;
}

function FleetIllustration() {
  return (
    <div className="relative mx-auto w-full max-w-xs" style={{ aspectRatio: "4/3" }}>
      <svg viewBox="0 0 280 210" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
        <rect x="0" y="170" width="280" height="4" rx="2" fill="#334155" opacity="0.5" />
        <rect x="50" y="100" width="160" height="68" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
        <rect x="160" y="80" width="60" height="88" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
        <circle cx="90" cy="172" r="14" fill="#0f172a" stroke="#334155" strokeWidth="2" />
        <circle cx="180" cy="172" r="14" fill="#0f172a" stroke="#334155" strokeWidth="2" />
        <text x="105" y="143" textAnchor="middle" fill="#10b981" fontSize="9" fontWeight="600" fontFamily="system-ui">
          E-SAMBA
        </text>
      </svg>
    </div>
  );
}

function ActivationTracker({ steps }: { steps: ActivationStep[] }) {
  const doneCount = steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);
  const widthPct = String(pct) + "%";

  return (
    <div className="rounded-card border border-surface-raised bg-surface space-y-3 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Activation</p>
        <span className="text-xs font-medium text-brand-light">{pct}% complété</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
        <div className="h-full rounded-full bg-brand transition-all duration-700" style={{ width: widthPct }} />
      </div>
      <div className="space-y-1.5">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px]",
                step.done ? "bg-brand text-white" : "border border-surface-raised text-transparent",
              )}
            >
              {step.done ? "\u2713" : null}
            </div>
            <span className={cn("text-xs", step.done ? "text-slate-400 line-through" : "text-slate-300")}>{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmptyStateDashboard({
  onAddVehicle,
  onConfigureAlerts,
  onInviteTeam,
  onDemoData,
  userName,
}: EmptyStateDashboardProps) {
  const greeting = userName ? `Bienvenue ${userName}` : "Bienvenue";

  const [activationSteps] = useState<ActivationStep[]>([
    { label: "Compte E-Samba cree", done: true },
    { label: "Ajouter votre premier vehicule", done: false },
    { label: "Configurer vos alertes", done: false },
    { label: "Inviter un membre de l'equipe", done: false },
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-8 py-4">
      <div className="w-full space-y-1 text-center sm:text-left">
        <h2 className="font-heading text-2xl font-semibold text-slate-100">{greeting}</h2>
        <p className="mx-auto max-w-md text-slate-400 sm:mx-0">
          Demarrez en ajoutant un vehicule, puis configurez les alertes et invitez votre equipe.
        </p>
      </div>

      <FleetIllustration />

      <div className="grid w-full gap-3 sm:grid-cols-1 md:grid-cols-3">
        <button
          type="button"
          className={cn(
            "group flex flex-col items-start gap-3 rounded-card border p-4 text-left transition-all",
            "border-brand/40 bg-brand/10 hover:border-brand/60 hover:bg-brand/15",
          )}
          onClick={onAddVehicle}
          aria-label="Ajouter maintenant"
        >
          <span className="text-sm font-medium text-slate-200">Ajouter un vehicule</span>
          <span className="text-xs leading-relaxed text-slate-500">
            Commencez par enregistrer votre premier camion ou vehicule utilitaire.
          </span>
          <span className="text-sm font-medium text-brand-light">Ajouter maintenant</span>
        </button>

        <button
          type="button"
          className={cn(
            "group flex flex-col items-start gap-3 rounded-card border p-4 text-left transition-all",
            "border-surface-raised bg-surface hover:border-slate-600 hover:bg-surface-raised",
          )}
          onClick={onConfigureAlerts}
          aria-label="Configurer les alertes"
        >
          <span className="text-sm font-medium text-slate-200">Configurer les alertes</span>
          <span className="text-xs leading-relaxed text-slate-500">
            Definissez les seuils kilometriques et les rappels d'entretien.
          </span>
          <span className="text-sm font-medium text-brand-light">Configurer</span>
        </button>

        <button
          type="button"
          className={cn(
            "group flex flex-col items-start gap-3 rounded-card border p-4 text-left transition-all",
            "border-surface-raised bg-surface hover:border-slate-600 hover:bg-surface-raised",
          )}
          onClick={onInviteTeam}
          aria-label="Inviter l'equipe"
        >
          <span className="text-sm font-medium text-slate-200">Inviter l'equipe</span>
          <span className="text-xs leading-relaxed text-slate-500">
            Partagez l'acces avec vos managers et chauffeurs.
          </span>
          <span className="text-sm font-medium text-brand-light">Inviter</span>
        </button>
      </div>

      <div className="w-full">
        <ActivationTracker steps={activationSteps} />
      </div>

      {onDemoData ? (
        <p className="w-full text-xs text-slate-600">
          Vous pouvez explorer le dashboard sans donnees en utilisant nos{" "}
          <button type="button" className="text-brand-light hover:underline" onClick={onDemoData}>
            donnees de demonstration
          </button>
          .
        </p>
      ) : null}
    </div>
  );
}
