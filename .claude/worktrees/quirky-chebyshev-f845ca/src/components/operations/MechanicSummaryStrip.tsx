import { ClipboardList, Wrench, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface MechanicSummaryStripProps {
  diagnosticsEnCours: number;
  actionsRealisees: number;
  cloturesPossibles: number;
}

/**
 * Bandeau synthèse atelier : volumes du jour (données mock).
 */
export function MechanicSummaryStrip({
  diagnosticsEnCours,
  actionsRealisees,
  cloturesPossibles,
}: MechanicSummaryStripProps) {
  const items = [
    {
      label: "Diagnostics en cours",
      value: diagnosticsEnCours,
      icon: ClipboardList,
      hint: "Dossiers ouverts ou planifiés",
    },
    {
      label: "Actions réalisées",
      value: actionsRealisees,
      icon: Wrench,
      hint: "Lignes saisies aujourd’hui",
    },
    {
      label: "Clôtures possibles",
      value: cloturesPossibles,
      icon: CheckCircle2,
      hint: "Interventions prêtes à solder",
    },
  ] as const;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map(({ label, value, icon: Icon, hint }) => (
        <Card key={label} className="border-border/80">
          <CardContent className="flex gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <Icon className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="font-heading text-2xl font-bold tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground">{hint}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
