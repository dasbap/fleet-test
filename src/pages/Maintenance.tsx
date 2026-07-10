import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Wrench,
  Plus,
  MoreHorizontal,
  Clock,
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Car,
  Calendar,
  Loader2,
} from "lucide-react";
import { useMaintenanceJobs, useUpdateJobStatus, type JobStatus, type MaintenanceJob } from "@/hooks/useMaintenance";
import { MaintenanceFormDialog } from "@/components/maintenance/MaintenanceFormDialog";
import { MaintenanceDetailDialog } from "@/components/maintenance/MaintenanceDetailDialog";
import { useAuth } from "@/hooks/useAuth";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useFeedbackPrompt } from "@/hooks/useFeedbackPrompt";
import { FeedbackWidget } from "@/components/shared/FeedbackWidget";
import { ContextualHelpTrigger } from "@/components/help/ContextualHelpTrigger";
import { ResponsiveDataView } from "@/components/data/ResponsiveDataView";
import { MaintenanceMobileList } from "@/components/maintenance/MaintenanceMobileList";
import { ErrorState } from "@/components/states";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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

export default function Maintenance() {
  const { role, userFleetId, user } = useAuth();
  const { can } = useRoleAccess();
  const maintenanceFeedback = useFeedbackPrompt({
    userId: user?.id ?? "",
    fleetId: userFleetId,
  });
  const maintenanceFeedbackRef = useRef(maintenanceFeedback);
  maintenanceFeedbackRef.current = maintenanceFeedback;

  const onMaintenanceJobMarkedReady = useCallback((jobId: string) => {
    if (user?.id && userFleetId) {
      maintenanceFeedbackRef.current.fire("maintenance_closed", jobId, "maintenance");
    }
  }, [user?.id, userFleetId]);
  const userRole = role || "mechanic";
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<JobStatus | "all">("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const { data: jobs = [], isLoading, error } = useMaintenanceJobs(
    userFleetId || undefined,
    activeTab === "all" ? undefined : activeTab
  );
  const updateStatus = useUpdateJobStatus();

  /** Ouvre le détail si l’URL contient `?job=` (ex. lien depuis la recherche universelle). */
  useEffect(() => {
    const id = searchParams.get("job");
    if (!id || jobs.length === 0) return;
    const found = jobs.some((j) => j.id === id);
    if (!found) return;
    setSelectedJobId(id);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("job");
        return next;
      },
      { replace: true },
    );
  }, [jobs, searchParams, setSearchParams]);

  const handleStatusChange = async (jobId: string, newStatus: JobStatus) => {
    try {
      await updateStatus.mutateAsync({ id: jobId, status: newStatus });
      if (newStatus === "ready") {
        onMaintenanceJobMarkedReady(jobId);
      }
    } catch {
      // React Query affiche deja le toast d'erreur via useUpdateJobStatus.onError.
    }
  };

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

  const renderJobRow = (job: MaintenanceJob) => {
    const status = statusConfig[job.status as JobStatus];
    const priority = priorityConfig[job.priority] || priorityConfig.medium;
    const StatusIcon = status.icon;
    const nextStatuses = getNextStatuses(job.status as JobStatus);

    return (
      <TableRow key={job.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedJobId(job.id)}>
        <TableCell>
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">{job.vehicle?.registration || "—"}</div>
              <div className="text-xs text-muted-foreground">
                {job.vehicle?.brand} {job.vehicle?.model}
              </div>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant={priority.variant}>{priority.label}</Badge>
        </TableCell>
        <TableCell>
          <Badge variant={status.variant} className="flex items-center gap-1 w-fit">
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </Badge>
        </TableCell>
        <TableCell>
          {job.incident ? (
            <div className="flex items-center gap-1 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="truncate max-w-[200px]">{job.incident.description}</span>
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">Maintenance planifiée</span>
          )}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {format(new Date(job.created_at), "dd MMM yyyy", { locale: fr })}
          </div>
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          {nextStatuses.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {nextStatuses.map((s) => {
                  const config = statusConfig[s];
                  const Icon = config.icon;
                  return (
                    <DropdownMenuItem
                      key={s}
                      onClick={() => handleStatusChange(job.id, s)}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      Passer en "{config.label}"
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-heading font-bold flex items-center gap-2">
                    <Wrench className="h-8 w-8" />
                    Interventions
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Gérez les interventions de maintenance sur vos véhicules
                  </p>
                  <ContextualHelpTrigger slug="create-intervention" className="mt-2" />
                </div>
                {can("maintenance.create") && (
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nouvelle intervention
                  </Button>
                )}
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">En attente</p>
                        <p className="text-2xl font-bold">
                          {jobs.filter((j) => j.status === "queued").length}
                        </p>
                      </div>
                      <Clock className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">En cours</p>
                        <p className="text-2xl font-bold">
                          {jobs.filter((j) => j.status === "in_progress").length}
                        </p>
                      </div>
                      <Play className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Terminées</p>
                        <p className="text-2xl font-bold">
                          {jobs.filter((j) => j.status === "ready").length}
                        </p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-chart-2" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Bloquées</p>
                        <p className="text-2xl font-bold">
                          {jobs.filter((j) => j.status === "blocked").length}
                        </p>
                      </div>
                      <XCircle className="h-8 w-8 text-destructive" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Jobs Table */}
              <Card>
                <CardHeader>
                  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as JobStatus | "all")}>
                    <TabsList>
                      <TabsTrigger value="all">Toutes</TabsTrigger>
                      <TabsTrigger value="queued">En attente</TabsTrigger>
                      <TabsTrigger value="in_progress">En cours</TabsTrigger>
                      <TabsTrigger value="ready">Terminées</TabsTrigger>
                      <TabsTrigger value="blocked">Bloquées</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : error ? (
                    <ErrorState
                      title="Interventions indisponibles"
                      description="Impossible de charger la liste. Réessayez."
                      onRetry={() => window.location.reload()}
                    />
                  ) : jobs.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Aucune intervention {activeTab !== "all" && statusConfig[activeTab as JobStatus]?.label.toLowerCase()}</p>
                    </div>
                  ) : (
                    <ResponsiveDataView
                      cards={
                        <MaintenanceMobileList
                          jobs={jobs}
                          statusConfig={statusConfig}
                          priorityConfig={priorityConfig}
                          onSelect={setSelectedJobId}
                          canUpdate={can("maintenance.update")}
                          onStatusChange={(id, s) => void handleStatusChange(id, s)}
                        />
                      }
                      table={
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Véhicule</TableHead>
                              <TableHead>Priorité</TableHead>
                              <TableHead>Statut</TableHead>
                              <TableHead>Origine</TableHead>
                              <TableHead>Créée le</TableHead>
                              <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {jobs.map(renderJobRow)}
                          </TableBody>
                        </Table>
                      }
                    />
                  )}
                </CardContent>
              </Card>
      </div>

      <MaintenanceFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        fleetId={userFleetId || undefined}
      />

      {selectedJobId && (
        <MaintenanceDetailDialog
          open={!!selectedJobId}
          onOpenChange={(open) => !open && setSelectedJobId(null)}
          jobId={selectedJobId}
          onJobMarkedReady={onMaintenanceJobMarkedReady}
        />
      )}

      {maintenanceFeedback.show && user?.id && userFleetId ? (
        <FeedbackWidget
          trigger={maintenanceFeedback.trigger}
          entityId={maintenanceFeedback.entityId}
          entityType={maintenanceFeedback.entityType}
          onDismiss={() => maintenanceFeedback.dismiss()}
          position="bottom-right"
        />
      ) : null}
    </>
  );
}
