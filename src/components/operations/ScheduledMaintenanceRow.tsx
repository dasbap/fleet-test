import { Link } from "react-router-dom";
import { CalendarClock, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OperationStatusBadge } from "./OperationStatusBadge";
import type { MockScheduledMaintenance } from "@/lib/operationsMock";

interface ScheduledMaintenanceRowProps {
  item: MockScheduledMaintenance;
}

export function ScheduledMaintenanceRow({ item }: ScheduledMaintenanceRowProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">
            {item.vehicleLabel}
            <span className="ml-2 text-sm font-normal text-muted-foreground">— {item.label}</span>
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarClock className="h-4 w-4 shrink-0" aria-hidden />
            {item.scheduledLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OperationStatusBadge status={item.status} />
          <Button size="sm" variant="secondary" asChild>
            <Link to={item.href}>
              Planning
              <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
