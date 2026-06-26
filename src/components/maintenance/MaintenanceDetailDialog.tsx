import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  useMaintenanceJob,
  useUpdateJobStatus,
  useUpdateMaintenanceJob,
  type JobStatus,
  type MaintenanceEvidence,
  type MaintenanceJobPart,
} from "@/hooks/useMaintenance";
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
  CalendarClock,
  FileText,
  Package,
  Plus,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import EvidenceUpload from "./EvidenceUpload";
import { useAuth } from "@/hooks/useAuth";

interface MaintenanceDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  /** Appelé après passage au statut « terminée » (ready), ex. sondage NPS. */
  onJobMarkedReady?: (jobId: string) => void;
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
  onJobMarkedReady,
}: MaintenanceDetailDialogProps) {
  const { data: job, isLoading, isError, error, refetch } = useMaintenanceJob(jobId);
  const updateStatus = useUpdateJobStatus();
  const updateJob = useUpdateMaintenanceJob();
  const { user } = useAuth();

  const [localNotes, setLocalNotes] = useState("");
  const [localPlannedAt, setLocalPlannedAt] = useState<string>("");
  const [localParts, setLocalParts] = useState<MaintenanceJobPart[]>([]);
  const [planningOpen, setPlanningOpen] = useState(true);
  const [newPartDesignation, setNewPartDesignation] = useState("");
  const [newPartQuantity, setNewPartQuantity] = useState(1);

  useEffect(() => {
    if (!job) return;
    setLocalNotes(job.notes ?? "");
    setLocalPlannedAt(
      job.planned_at
        ? format(new Date(job.planned_at), "yyyy-MM-dd'T'HH:mm")
        : ""
    );
    setLocalParts(Array.isArray(job.parts) ? [...job.parts] : []);
  }, [job]);

  const handleSavePlanning = async () => {
    await updateJob.mutateAsync({
      id: jobId,
      notes: localNotes || null,
      planned_at: localPlannedAt ? new Date(localPlannedAt).toISOString() : null,
      parts: localParts.length > 0 ? localParts : [],
    });
  };

  const handleAddPart = () => {
    const designation = newPartDesignation.trim();
    if (!designation) return;
    setLocalParts((prev) => [
      ...prev,
      { designation, quantity: Math.max(1, Math.floor(newPartQuantity)) },
    ]);
    setNewPartDesignation("");
    setNewPartQuantity(1);
  };

  const handleRemovePart = (index: number) => {
    setLocalParts((prev) => prev.filter((_, i) => i !== index));
  };

  if (isError) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Détails de l'intervention
            </DialogTitle>
            <DialogDescription className="sr-only">
              Le détail de l'intervention n'a pas pu être chargé. Vous pouvez réessayer ou
              fermer la fenêtre.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <p className="text-sm text-destructive text-center">
              {error instanceof Error ? error.message : "Impossible de charger l'intervention."}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => refetch()}>
                Réessayer
              </Button>
              <Button variant="secondary" onClick={() => onOpenChange(false)}>
                Fermer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!job) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="sr-only">Détails de l'intervention</DialogTitle>
            <DialogDescription className="sr-only">
              Chargement de l'intervention
            </DialogDescription>
          </DialogHeader>
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
  const evidence = job.evidence ?? [];
  const hasBeforePhoto = evidence.some((item) => item.kind === "before");
  const hasAfterPhoto = evidence.some((item) => item.kind === "after");
  const canCloseFromEvidence = hasBeforePhoto && hasAfterPhoto;
  const closureBlockMessage = !hasBeforePhoto
    ? "Ajoutez au moins une photo avant intervention."
    : !hasAfterPhoto
      ? "Ajoutez au moins une photo après intervention."
      : undefined;

  const handleStatusChange = async (newStatus: JobStatus) => {
    await updateStatus.mutateAsync({ id: jobId, status: newStatus });
    if (newStatus === "ready") {
      onJobMarkedReady?.(jobId);
    }
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
                    (job.evidence || []).filter((e: MaintenanceEvidence) => e.kind === 'before')
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
                    (job.evidence || []).filter((e: MaintenanceEvidence) => e.kind === 'after')
                  }
                  userId={user?.id || ''}
                  disabled={job.status === 'ready'}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Planification et suivi */}
          <Separator />
          <Collapsible open={planningOpen} onOpenChange={setPlanningOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-2 p-0 h-auto font-medium">
                {planningOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                Planification et suivi
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
              {/* Date prévue */}
              <div>
                <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                  <CalendarClock className="h-4 w-4" />
                  Date prévue
                </h4>
                {job.status === "ready" ? (
                  <p className="text-sm text-muted-foreground">
                    {job.planned_at
                      ? format(new Date(job.planned_at), "dd/MM/yyyy HH:mm", { locale: fr })
                      : "Non planifiée"}
                  </p>
                ) : (
                  <Input
                    type="datetime-local"
                    value={localPlannedAt}
                    onChange={(e) => setLocalPlannedAt(e.target.value)}
                    className="max-w-[240px]"
                  />
                )}
              </div>
              {/* Notes */}
              <div>
                <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4" />
                  Notes / commentaires
                </h4>
                {job.status === "ready" ? (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {job.notes || "—"}
                  </p>
                ) : (
                  <Textarea
                    placeholder="Commentaires sur l'intervention…"
                    value={localNotes}
                    onChange={(e) => setLocalNotes(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                )}
              </div>
              {/* Pièces */}
              <div>
                <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4" />
                  Pièces / consommables
                </h4>
                {localParts.length > 0 && (
                  <ul className="mb-2 space-y-1 text-sm">
                    {localParts.map((p, i) => (
                      <li
                        key={`${p.designation}-${i}`}
                        className="flex items-center justify-between gap-2 py-1 border-b border-border/50 last:border-0"
                      >
                        <span>
                          {p.designation} × {p.quantity}
                        </span>
                        {job.status !== "ready" && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleRemovePart(i)}
                            aria-label="Supprimer la pièce"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {job.status !== "ready" && (
                  <div className="flex flex-wrap gap-2 items-end">
                    <Input
                      placeholder="Désignation"
                      value={newPartDesignation}
                      onChange={(e) => setNewPartDesignation(e.target.value)}
                      className="w-[180px]"
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddPart())}
                    />
                    <Input
                      type="number"
                      min={1}
                      value={newPartQuantity}
                      onChange={(e) => setNewPartQuantity(Number(e.target.value) || 1)}
                      className="w-20"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={handleAddPart}>
                      <Plus className="h-4 w-4 mr-1" />
                      Ajouter
                    </Button>
                  </div>
                )}
              </div>
              {job.status !== "ready" && (
                <Button
                  onClick={handleSavePlanning}
                  disabled={updateJob.isPending}
                >
                  {updateJob.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Enregistrer planification et suivi
                </Button>
              )}
            </CollapsibleContent>
          </Collapsible>

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
                      disabled={
                        updateStatus.isPending || (s === "ready" && !canCloseFromEvidence)
                      }
                      title={s === "ready" && !canCloseFromEvidence ? closureBlockMessage : undefined}
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
