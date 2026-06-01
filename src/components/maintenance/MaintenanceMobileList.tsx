import { Car, MoreHorizontal } from "lucide-react";
import { MobileCard } from "@/components/mobile/ui/MobileCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { MaintenanceJob, JobStatus } from "@/hooks/useMaintenance";

interface MaintenanceMobileListProps {
  jobs: MaintenanceJob[];
  statusConfig: Record<JobStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }>;
  priorityConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }>;
  onSelect: (jobId: string) => void;
  onStatusChange?: (jobId: string, status: JobStatus) => void;
  canUpdate?: boolean;
}

export function MaintenanceMobileList({
  jobs,
  statusConfig,
  priorityConfig,
  onSelect,
  onStatusChange,
  canUpdate,
}: MaintenanceMobileListProps) {
  return (
    <ul className="space-y-3" role="list">
      {jobs.map((job) => {
        const st = statusConfig[job.status];
        const pr = priorityConfig[job.priority] ?? priorityConfig.medium;
        const reg =
          (job.vehicle as { registration?: string } | null)?.registration ?? "—";
        return (
          <li key={job.id}>
            <MobileCard
              className="p-4 cursor-pointer"
              onClick={() => onSelect(job.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono font-semibold flex items-center gap-1">
                    <Car className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    {reg}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {(job.incident as { description?: string } | null)?.description ||
                      "Sans description"}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant={st.variant}>{st.label}</Badge>
                    <Badge variant={pr.variant}>{pr.label}</Badge>
                  </div>
                </div>
                {canUpdate && onStatusChange ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" aria-label="Changer le statut">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {(Object.keys(statusConfig) as JobStatus[]).map((s) => (
                        <DropdownMenuItem
                          key={s}
                          onClick={() => onStatusChange(job.id, s)}
                        >
                          {statusConfig[s].label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>
            </MobileCard>
          </li>
        );
      })}
    </ul>
  );
}
