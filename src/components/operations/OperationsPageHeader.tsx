import type { AppRole } from "@/hooks/useAuth";
import { LayoutGrid } from "lucide-react";

const roleCopy: Record<NonNullable<AppRole>, { title: string; subtitle: string }> = {
  organizer: {
    title: "Opérations terrain",
    subtitle: "Missions, circulation, incidents et tâches du jour.",
  },
  manager: {
    title: "Opérations flotte",
    subtitle: "Synthèse du parc, incidents et maintenance planifiée.",
  },
  driver: {
    title: "Ma journée",
    subtitle: "Mission, véhicule, checklists et signalement.",
  },
  mechanic: {
    title: "Atelier & interventions",
    subtitle: "Diagnostics, actions réalisées et clôtures.",
  },
};

interface OperationsPageHeaderProps {
  role: AppRole | null;
}

/** En-tête contextualisé du hub Opérations. */
export function OperationsPageHeader({ role }: OperationsPageHeaderProps) {
  const r = role ?? "organizer";
  const copy = roleCopy[r] ?? roleCopy.organizer;

  return (
    <header className="space-y-2 border-b border-border/50 pb-4 sm:pb-6">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary md:h-11 md:w-11 md:rounded-xl">
          <LayoutGrid className="h-6 w-6" aria-hidden />
        </div>
        <div className="min-w-0 pt-0.5">
          <h1 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">{copy.title}</h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{copy.subtitle}</p>
        </div>
      </div>
    </header>
  );
}
