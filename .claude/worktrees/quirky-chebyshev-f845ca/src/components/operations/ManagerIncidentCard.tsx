import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { MockManagerIncident } from "@/lib/operationsMock";
import { cn } from "@/lib/utils";

const severityVariant: Record<MockManagerIncident["severity"], "default" | "secondary" | "destructive" | "outline"> = {
  critical: "destructive",
  high: "destructive",
  medium: "secondary",
};

const severityLabel: Record<MockManagerIncident["severity"], string> = {
  critical: "Critique",
  high: "Élevée",
  medium: "Moyenne",
};

interface ManagerIncidentCardProps {
  incident: MockManagerIncident;
}

/** Carte incident pour la vue gestionnaire (impact parc). */
export function ManagerIncidentCard({ incident }: ManagerIncidentCardProps) {
  return (
    <Card className="border-l-4 border-l-warning/60 transition-colors hover:bg-muted/20">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-warning" aria-hidden />
            <Badge variant={severityVariant[incident.severity]} className={cn("font-normal")}>
              {severityLabel[incident.severity]}
            </Badge>
          </div>
          <p className="mt-2 font-medium leading-snug">{incident.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{incident.vehicleLabel}</span>
            {" · "}
            {incident.impact}
          </p>
        </div>
        <Button size="sm" variant="outline" className="shrink-0" asChild>
          <Link to={incident.href}>
            Suivre
            <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
