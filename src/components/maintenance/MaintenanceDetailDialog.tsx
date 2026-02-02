import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMaintenanceJob, useUpdateJobStatus, type JobStatus } from "@/hooks/useMaintenance";
import {
  Loader2,
  Wrench,
  Car,
  AlertTriangle,
  Clock,
  Play,
  CheckCircle,
  XCircle,
  Calendar,
  Camera,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import EvidenceUpload from "./EvidenceUpload";
import { useAuth } from "@/hooks/useAuth";

interface MaintenanceDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
}

const statusConfig: Record<JobStatus, { label: string; icon: typeof Clock; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  queued: { label: "En attente", icon: Clock, variant: "secondary" },
  in_progress: { label: "En cours", icon: Play, variant: "default" },
  ready: { label: "Terminée", icon: CheckCircle, variant: "outline" },
  blocked: { label: "Bloquée", icon: XCircle, variant: "destructive" },
};

const priorityConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  low: { label: "Basse", variant: "outline" },
  medium: { label: "Moyenne", variant: "secondary" },
  high: { label: "Haute", variant: "default" },
  critical: { label: "Critique", variant: "destructive" },
};

export function MaintenanceDetailDialog({
  open,
  onOpenChange,
  jobId,
}: MaintenanceDetailDialogProps) {
  const { data: job, isLoading } = useMaintenanceJob(jobId);
  const updateStatus = useUpdateJobStatus();
  const { user } = useAuth();

  if (!job) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const status = statusConfig[job.status as JobStatus];
  const priority = priorityConfig[job.priority] || priorityConfig.medium;
  const StatusIcon = status.icon;

  const getNextStatuses = (currentStatus: JobStatus): JobStatus[] => {
    switch (currentStatus) {
      case "queued":
        return ["in_progress", "blocked"];
      case "in_progress":
        return ["ready", "blocked"];
      case "blocked":
        return ["queued", "in_progress"];
      case "ready":
        return [];
      default:
        return [];
    }
  };

  const nextStatuses = getNextStatuses(job.status as JobStatus);

  const handleStatusChange = async (newStatus: JobStatus) => {
    await updateStatus.mutateAsync({ id: jobId, status: newStatus });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Détails de l'intervention
          </DialogTitle>
          <DialogDescription>
            Intervention créée le {format(new Date(job.created_at), "dd MMMM yyyy à HH:mm", { locale: fr })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Vehicle Info */}
          <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
            <Car className="h-10 w-10 text-muted-foreground" />
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{job.vehicle?.registration}</h3>
              <p className="text-muted-foreground">
                {job.vehicle?.brand} {job.vehicle?.model}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant={status.variant} className="flex items-center gap-1">
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </Badge>
              <Badge variant={priority.variant}>{priority.label}</Badge>
            </div>
          </div>

          {/* Incident Source */}
          {job.incident && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Origine: Incident signalé
                </h4>
                <div className="p-3 border rounded-lg bg-background">
                  <p className="text-sm">{job.incident.description}</p>
                  <Badge variant="outline" className="mt-2">
                    Sévérité: {job.incident.severity}
                  </Badge>
                </div>
              </div>
            </>
          )}

          {/* Evidence with Upload */}
          <Separator />
          <div>
            <h4 className="font-medium flex items-center gap-2 mb-3">
              <Camera className="h-4 w-4" />
              Preuves photos
            </h4>
            
            <Tabs defaultValue="before" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="before">Avant intervention</TabsTrigger>
                <TabsTrigger value="after">Après intervention</TabsTrigger>
              </TabsList>
              <TabsContent value="before" className="mt-4">
                <EvidenceUpload
                  jobId={jobId}
                  kind="before"
                  existingEvidence={
                    (job.evidence || []).filter((e: any) => e.kind === 'before')
                  }
                  userId={user?.id || ''}
                  disabled={job.status === 'ready'}
                />
              </TabsContent>
              <TabsContent value="after" className="mt-4">
                <EvidenceUpload
                  jobId={jobId}
                  kind="after"
                  existingEvidence={
                    (job.evidence || []).filter((e: any) => e.kind === 'after')
                  }
                  userId={user?.id || ''}
                  disabled={job.status === 'ready'}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Timeline */}
          <Separator />
          <div>
            <h4 className="font-medium flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4" />
              Historique
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Créée</span>
                <span>{format(new Date(job.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}</span>
              </div>
              {job.closed_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Clôturée</span>
                  <span>{format(new Date(job.closed_at), "dd/MM/yyyy HH:mm", { locale: fr })}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {nextStatuses.length > 0 && (
            <>
              <Separator />
              <div className="flex flex-wrap gap-2">
                {nextStatuses.map((s) => {
                  const config = statusConfig[s];
                  const Icon = config.icon;
                  return (
                    <Button
                      key={s}
                      variant={s === "ready" ? "default" : s === "blocked" ? "destructive" : "outline"}
                      onClick={() => handleStatusChange(s)}
                      disabled={updateStatus.isPending}
                    >
                      {updateStatus.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Icon className="mr-2 h-4 w-4" />
                      )}
                      Passer en "{config.label}"
                    </Button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
