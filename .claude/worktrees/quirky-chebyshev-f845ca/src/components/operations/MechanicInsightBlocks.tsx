import { Link } from "react-router-dom";
import { ClipboardList, Wrench } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { MockMechanicIntervention } from "@/lib/operationsMock";
import { OperationsEmptyState } from "./OperationsEmptyState";

interface MechanicInsightBlocksProps {
  interventions: MockMechanicIntervention[];
}

export function MechanicDiagnosticsBlock({ interventions }: MechanicInsightBlocksProps) {
  if (interventions.length === 0) {
    return <OperationsEmptyState message="Aucune intervention à afficher pour aujourd’hui." />;
  }

  return (
    <ul className="space-y-2">
      {interventions.map((i) => (
        <li key={i.id}>
          <Card className="border-border/80">
            <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <ClipboardList className="h-3.5 w-3.5" aria-hidden />
                  Diagnostic
                </p>
                <p className="mt-1 font-medium text-foreground">
                  {i.vehicleLabel}{" "}
                  <span className="font-mono text-sm font-normal text-muted-foreground">({i.plate})</span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{i.diagnostic}</p>
              </div>
              <Button variant="outline" size="sm" className="shrink-0" asChild>
                <Link to={i.href}>Fiche</Link>
              </Button>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}

export function MechanicActionsBlock({ interventions }: MechanicInsightBlocksProps) {
  const rows = interventions.flatMap((inv) =>
    inv.actionsDone.map((action, idx) => ({
      key: `${inv.id}-${idx}`,
      vehicle: inv.vehicleLabel,
      plate: inv.plate,
      action,
      href: inv.href,
    }))
  );

  if (rows.length === 0) {
    return (
      <OperationsEmptyState
        message="Aucune action réalisée saisie pour cette journée — complétez les fiches maintenance."
        icon={<Wrench className="mx-auto h-10 w-10 opacity-70" aria-hidden />}
      />
    );
  }

  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.key}>
          <Card>
            <CardContent className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">
                  {row.vehicle}{" "}
                  <span className="font-mono text-muted-foreground/90">({row.plate})</span>
                </p>
                <p className="mt-0.5 flex items-start gap-2 text-sm">
                  <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                  <span>{row.action}</span>
                </p>
              </div>
              <Button variant="ghost" size="sm" className="shrink-0" asChild>
                <Link to={row.href}>Voir</Link>
              </Button>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
