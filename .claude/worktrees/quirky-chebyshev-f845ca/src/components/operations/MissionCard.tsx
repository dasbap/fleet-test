import { Link } from "react-router-dom";
import { ArrowRight, Clock, User, Truck } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OperationStatusBadge } from "./OperationStatusBadge";
import type { MockMissionCard } from "@/lib/operationsMock";

interface MissionCardProps {
  mission: MockMissionCard;
  ctaLabel?: string;
}

export function MissionCard({ mission, ctaLabel = "Ouvrir" }: MissionCardProps) {
  return (
    <Card className="overflow-hidden border-l-4 border-l-primary/80 transition-shadow hover:shadow-md">
      <CardHeader className="space-y-2 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-heading text-base font-semibold leading-tight">{mission.title}</p>
            {mission.subtitle ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{mission.subtitle}</p>
            ) : null}
          </div>
          <OperationStatusBadge status={mission.status} />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Truck className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {mission.vehicleLabel}
          </span>
          {mission.driverName ? (
            <span className="inline-flex items-center gap-1">
              <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {mission.driverName}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {mission.timeWindow}
          </span>
        </div>
      </CardHeader>
      <CardContent className="border-t bg-muted/15 pt-3">
        <Button variant="default" size="sm" className="w-full sm:w-auto" asChild>
          <Link to={mission.href}>
            {ctaLabel}
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
