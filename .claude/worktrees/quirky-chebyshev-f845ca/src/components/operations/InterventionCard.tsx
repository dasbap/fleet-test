import { Link } from "react-router-dom";
import { ArrowRight, ClipboardList, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OperationStatusBadge } from "./OperationStatusBadge";
import type { MockMechanicIntervention } from "@/lib/operationsMock";

const priorityLabel: Record<MockMechanicIntervention["priority"], string> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
  critical: "Critique",
};

interface InterventionCardProps {
  intervention: MockMechanicIntervention;
}

export function InterventionCard({ intervention }: InterventionCardProps) {
  return (
    <Card className="border-l-4 border-l-accent/80">
      <CardHeader className="space-y-2 pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-heading text-base font-semibold">
              {intervention.vehicleLabel}
              <span className="ml-2 font-mono text-sm font-normal text-muted-foreground">
                {intervention.plate}
              </span>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline">{priorityLabel[intervention.priority]}</Badge>
              <OperationStatusBadge status={intervention.status} />
            </div>
          </div>
        </div>
        <div className="rounded-md bg-muted/40 p-3 text-sm">
          <p className="flex items-center gap-1.5 font-medium text-foreground">
            <ClipboardList className="h-4 w-4 shrink-0" aria-hidden />
            Diagnostic
          </p>
          <p className="mt-1 text-muted-foreground">{intervention.diagnostic}</p>
        </div>
        {intervention.actionsDone.length > 0 ? (
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Wrench className="h-3.5 w-3.5" aria-hidden />
              Actions réalisées
            </p>
            <ul className="list-inside list-disc text-sm text-muted-foreground">
              {intervention.actionsDone.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2 border-t bg-muted/15 pt-3">
        <Button size="sm" asChild>
          <Link to={intervention.href}>
            Ouvrir la fiche
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
          </Link>
        </Button>
        {intervention.canClose ? (
          <Button size="sm" variant="secondary" asChild>
            <Link to={intervention.href}>Clôturer l’intervention</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
