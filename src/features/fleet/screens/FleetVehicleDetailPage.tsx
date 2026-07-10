import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale/fr";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  ChevronDown,
  Droplets,
  Pencil,
  Plus,
  Share2,
  UserMinus,
  UserPlus,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AssignmentFormDialog } from "@/components/vehicles/AssignmentFormDialog";
import { useEndAssignment } from "@/hooks/useAssignments";
import { cn } from "@/lib/utils";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { useAuth } from "@/hooks/useAuth";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useVehicleDetail } from "@/hooks/useVehicles";
import { useVehicleAlerts } from "@/hooks/useAlerts";
import { useVehicleMaintenanceJobs, useMaintenanceJob } from "@/hooks/useMaintenance";
import { useFuelLogsByVehicle } from "@/hooks/useFuel";
import {
  buildVehicleDetailStats,
  daysUntil,
  getJobScheduledIso,
  isMaintenanceJobDone,
  maintenancePriorityLabel,
  maintenanceShortLabel,
  nextMaintenanceUrgency,
  pickNextPendingMaintenance,
  sortJobsForTimeline,
  timelineSeverityForJob,
  vehicleStatusUi,
} from "@/features/fleet/lib/vehicleHistory";
import {
  formatDateShort,
  formatDateTime,
  formatXaf,
  SEVERITY_UI,
} from "@/features/fleet/lib/vehicleDetailFormatters";
import { useSignedStorageUrl } from "@/hooks/useSignedStorageUrl";
import { shareContent, buildVehicleDocumentSharePayload } from "@/services/share.service";
import { toast } from "@/hooks/use-toast";
import { recordRecentVehicleView } from "@/lib/storage/flotteEsambaLocalCache";
import type { VehicleDto } from "@/types/dto/vehicle.dto";
import type { MaintenanceJob } from "@/repositories/maintenance.repository";
import type { AlertDto } from "@/types/dto/alert.dto";
import type { FuelEntry } from "@/repositories/fuel.repository";

function MaintenanceEvidenceDocLink({
  filePath,
  kind,
}: {
  filePath: string;
  kind: string;
}) {
  const { data: href, isLoading } = useSignedStorageUrl("maintenance-evidence", filePath);

  if (isLoading) {
    return (
      <span className="rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground">
        Chargement…
      </span>
    );
  }

  if (!href) {
    return (
      <span className="rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground">
        Fichier indisponible
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-xs hover:bg-muted"
    >
      <span aria-hidden>{kind === "before" ? "Avant" : "Après"}</span>
      <span className="max-w-[140px] truncate">{filePath.split("/").pop() ?? filePath}</span>
    </a>
  );
}


function VehicleHero({
  vehicle,
  declareIncidentHref,
  maintenanceHref,
}: {
  vehicle: VehicleDto;
  declareIncidentHref: string;
  maintenanceHref: string;
}) {
  const st = vehicleStatusUi(vehicle);
  return (
    <Card className="overflow-hidden border-border">
      <div className="relative w-full bg-muted/40" style={{ aspectRatio: "16/6" }}>
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <div className="flex flex-col items-center gap-2">
            <Wrench className="h-12 w-12 opacity-40" aria-hidden />
            <span className="text-xs">Aucune photo</span>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background to-transparent" />
        <div className="absolute top-3 right-3">
          <Badge variant={st.variant === "blocked" ? "destructive" : "secondary"} className="backdrop-blur-sm">
            {st.label}
          </Badge>
        </div>
      </div>
      <div className="flex items-start justify-between gap-4 p-5 pt-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">{vehicle.registration}</h1>
            <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
              {vehicle.year ?? "—"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {vehicle.brand ?? "—"} {vehicle.model ?? ""}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {vehicle.current_km.toLocaleString("fr-FR")} km parcourus
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" className="border-destructive/30 text-destructive" asChild>
            <Link to={declareIncidentHref}>
              <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
              Signaler
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={maintenanceHref}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Entretien
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

function KpiBar({
  stats,
  nextJob,
}: {
  stats: ReturnType<typeof buildVehicleDetailStats>;
  nextJob: MaintenanceJob | null;
}) {
  const urgency = nextMaintenanceUrgency(nextJob);
  const delta = nextJob ? daysUntil(getJobScheduledIso(nextJob)) : null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Card>
        <CardContent className="space-y-1 p-4">
          <p className="text-xs text-muted-foreground">Coût 12 mois</p>
          <p className="font-heading text-lg font-semibold tabular-nums">{formatXaf(stats.totalCostXaf12m)}</p>
          <p className="text-[10px] text-muted-foreground">moy. {formatXaf(stats.avgCostPerMonth)}/mois</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-1 p-4">
          <p className="text-xs text-muted-foreground">Interventions</p>
          <div className="flex items-baseline gap-1.5">
            <span className="font-heading text-lg font-semibold">{stats.completedCount}</span>
            <span className="text-xs text-muted-foreground">terminées</span>
          </div>
          <p className="text-[10px] text-muted-foreground">{stats.pendingCount} en attente</p>
        </CardContent>
      </Card>
      <Card
        className={cn(
          urgency === "critical" && "border-destructive/40 bg-destructive/5",
          urgency === "warning" && "border-warning/40 bg-warning/5"
        )}
      >
        <CardContent className="space-y-1 p-4">
          <p className="text-xs text-muted-foreground">Prochain entretien</p>
          {nextJob ? (
            <>
              <p
                className={cn(
                  "font-heading text-lg font-semibold tabular-nums",
                  urgency === "critical" && "text-destructive",
                  urgency === "warning" && "text-warning",
                  urgency === "info" && "text-foreground"
                )}
              >
                {delta !== null && delta < 0
                  ? `${Math.abs(delta)} j. de retard`
                  : delta !== null
                    ? `J−${delta}`
                    : "—"}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">{maintenanceShortLabel(nextJob)}</p>
            </>
          ) : (
            <p className="font-heading text-lg font-semibold text-primary">À jour</p>
          )}
        </CardContent>
      </Card>
      <Card className={cn(stats.criticalAlerts > 0 && "border-destructive/40 bg-destructive/5")}>
        <CardContent className="space-y-1 p-4">
          <p className="text-xs text-muted-foreground">Alertes actives</p>
          <p
            className={cn(
              "font-heading text-lg font-semibold",
              stats.criticalAlerts > 0 ? "text-destructive" : "text-primary"
            )}
          >
            {stats.criticalAlerts > 0 ? stats.criticalAlerts : "0"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {stats.criticalAlerts > 0 ? "critique(s)" : "aucune critique"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function CountdownBanner({
  job,
  planHref,
}: {
  job: MaintenanceJob;
  planHref: string;
}) {
  const d = daysUntil(getJobScheduledIso(job));
  const isOverdue = d < 0;
  const isUrgent = d >= 0 && d <= 7;
  if (!isOverdue && !isUrgent) return null;

  return (
    <Card
      className={cn(
        "flex flex-row items-center gap-3 p-4",
        isOverdue ? "border-destructive/40 bg-destructive/10" : "border-warning/40 bg-warning/10"
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg",
          isOverdue ? "bg-destructive/20" : "bg-warning/20"
        )}
      >
        {isOverdue ? (
          <AlertTriangle className="h-5 w-5 text-destructive" />
        ) : (
          <CalendarClock className="h-5 w-5 text-warning" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium", isOverdue ? "text-destructive" : "text-warning")}>
          {isOverdue
            ? `Intervention dépassée de ${Math.abs(d)} jour${Math.abs(d) > 1 ? "s" : ""}`
            : `Intervention dans ${d} jour${d > 1 ? "s" : ""}`}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {maintenanceShortLabel(job)} · prévu le {formatDateShort(getJobScheduledIso(job))}
        </p>
      </div>
      <Button variant="outline" size="sm" className="shrink-0" asChild>
        <Link to={planHref}>Planifier</Link>
      </Button>
    </Card>
  );
}

function MaintenanceTimeline({
  jobs,
  maintenanceHref,
}: {
  jobs: MaintenanceJob[];
  maintenanceHref: string;
}) {
  const sorted = useMemo(() => sortJobsForTimeline(jobs), [jobs]);
  const [openId, setOpenId] = useState<string | null>(null);
  const detailQuery = useMaintenanceJob(openId ?? undefined);

  if (sorted.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Aucune intervention enregistrée pour ce véhicule.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative overflow-x-auto pb-2">
        <div className="flex min-w-max gap-0" style={{ minWidth: `${sorted.length * 120}px` }}>
          {sorted.map((job, idx) => {
            const done = isMaintenanceJobDone(job);
            const sched = getJobScheduledIso(job);
            const sev = timelineSeverityForJob(job);
            const colors = SEVERITY_UI[sev];
            const delta = daysUntil(sched);
            const isLast = idx === sorted.length - 1;

            return (
              <div key={job.id} className="relative flex items-start">
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => setOpenId((id) => (id === job.id ? null : job.id))}
                    className={cn(
                      "z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold ring-2 ring-offset-2 ring-offset-background transition-all",
                      done
                        ? "border-primary bg-primary text-primary-foreground ring-primary/20"
                        : cn("border-current bg-muted", colors.text, colors.ring),
                      openId === job.id && "scale-110"
                    )}
                    title={maintenanceShortLabel(job)}
                  >
                    {done ? "OK" : <Wrench className="h-4 w-4" />}
                  </button>
                  {!isLast && (
                    <div className="relative mt-3.5 flex w-24 items-center">
                      <div className={cn("h-px flex-1", done ? "bg-primary/40" : "bg-border")} />
                    </div>
                  )}
                </div>
                <div
                  className="absolute mt-10 flex flex-col items-center gap-0.5"
                  style={{ width: isLast ? "80px" : "120px", marginLeft: isLast ? "-16px" : "-28px" }}
                >
                  <span className="w-full truncate text-center text-[10px] font-medium">{maintenanceShortLabel(job)}</span>
                  <span className="text-[9px] text-muted-foreground">
                    {formatDateShort(done ? job.closed_at ?? job.created_at : sched)}
                  </span>
                  {!done && (
                    <span className={cn("text-[9px] font-medium", colors.text)}>
                      {delta < 0 ? `${Math.abs(delta)} j. retard` : `J−${delta}`}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="h-12" />
      </div>

      <div className="space-y-2">
        {sorted.map((job) => {
          const done = isMaintenanceJobDone(job);
          const sched = getJobScheduledIso(job);
          const sev = timelineSeverityForJob(job);
          const colors = SEVERITY_UI[sev];
          const delta = daysUntil(sched);
          const expanded = openId === job.id;

          return (
            <Card key={job.id} className={cn("overflow-hidden transition-all", expanded ? "border-border" : "border-border/60")}>
              <button
                type="button"
                onClick={() => setOpenId((id) => (id === job.id ? null : job.id))}
                className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/40"
              >
                <div className={cn("w-1 shrink-0 self-stretch rounded-full", colors.bar)} />
                <Wrench className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{maintenanceShortLabel(job)}</span>
                    <Badge variant="outline" className={cn("text-[10px]", colors.badge)}>
                      {done ? "Terminé" : delta < 0 ? `${Math.abs(delta)} j. retard` : `J−${delta}`}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {maintenancePriorityLabel(job.priority)}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {formatDateTime(done ? job.closed_at ?? job.created_at : sched)}
                    {job.notes ? ` · ${job.notes}` : ""}
                  </p>
                </div>
                {!done ? (
                  <Button variant="secondary" size="sm" className="shrink-0" asChild>
                    <Link to={maintenanceHref} onClick={(e) => e.stopPropagation()}>
                      Planifier
                    </Link>
                  </Button>
                ) : null}
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")} />
              </button>
              {expanded ? (
                <div className="space-y-2 border-t border-border bg-muted/20 px-4 py-3 text-sm">
                  {job.notes ? (
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Notes</p>
                      <p className="text-foreground/90">{job.notes}</p>
                    </div>
                  ) : null}
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Preuves</p>
                    {detailQuery.isLoading && openId === job.id ? (
                      <p className="text-xs text-muted-foreground">Chargement…</p>
                    ) : detailQuery.data?.evidence?.length ? (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {detailQuery.data.evidence.map((doc) => (
                          <MaintenanceEvidenceDocLink
                            key={doc.id}
                            filePath={doc.file_path}
                            kind={doc.kind}
                          />
                        ))}
                      </div>
                    ) : openId === job.id ? (
                      <p className="text-xs text-muted-foreground">Aucune preuve jointe.</p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function VehicleInfoPanel({
  vehicle,
  canAssignDriver,
  onAssign,
  onEndAssignment,
  isEndingAssignment,
}: {
  vehicle: VehicleDto;
  canAssignDriver?: boolean;
  onAssign?: () => void;
  onEndAssignment?: () => void;
  isEndingAssignment?: boolean;
}) {
  const st = vehicleStatusUi(vehicle);
  const fields: [string, string][] = [
    ["Plaque", vehicle.registration],
    ["Marque", vehicle.brand ?? "—"],
    ["Modèle", vehicle.model ?? "—"],
    ["Année", vehicle.year?.toString() ?? "—"],
    ["Kilométrage", `${vehicle.current_km.toLocaleString("fr-FR")} km`],
    ["Statut", st.label],
    ["Conducteur", vehicle.active_assignment?.driver?.full_name?.trim() || "Non assigné"],
    ["Enregistré", formatDateShort(vehicle.created_at)],
  ];

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Informations véhicule</p>
      </div>
      <div className="divide-y divide-border">
        {fields.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between px-4 py-2.5">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="max-w-[60%] truncate text-right text-xs font-medium">{value}</span>
          </div>
        ))}
      </div>
      {canAssignDriver && vehicle.status === "ok" ? (
        <div className="border-t border-border p-4">
          {vehicle.active_assignment ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-2 border-destructive/30 text-destructive hover:text-destructive"
              disabled={isEndingAssignment}
              onClick={onEndAssignment}
            >
              <UserMinus className="h-4 w-4" aria-hidden />
              Delier le chauffeur
            </Button>
          ) : (
            <Button type="button" variant="outline" size="sm" className="w-full gap-2" onClick={onAssign}>
              <UserPlus className="h-4 w-4" aria-hidden />
              Affecter un chauffeur
            </Button>
          )}
        </div>
      ) : null}
    </Card>
  );
}

function FuelHistorySection({ entries }: { entries: FuelEntry[] }) {
  if (entries.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Aucun plein carburant enregistré pour ce véhicule.
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      {entries.slice(0, 12).map((e) => (
        <Card key={e.id} className="border-border/60">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Droplets className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{formatXaf(e.amount_xof)}</p>
              <p className="text-xs text-muted-foreground">
                {e.liters.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} L
                {" · "}
                {e.odometer_km.toLocaleString("fr-FR")} km
              </p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{formatDateShort(e.purchased_at)}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}

function FleetVehicleDetailSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 pb-24">
      <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
      <Card className="overflow-hidden">
        <div className="bg-muted/40" style={{ aspectRatio: "16/6" }} />
        <div className="flex items-start justify-between p-5">
          <div className="space-y-2">
            <div className="h-7 w-32 animate-pulse rounded-md bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded-md bg-muted" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
            <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
          </div>
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="space-y-2 p-4">
              <div className="h-3 w-16 animate-pulse rounded bg-muted" />
              <div className="h-6 w-20 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function VehicleDetailLoaded({
  vehicle,
  jobs,
  jobsLoading,
  alerts,
  fuelEntries,
  onShare,
  canAssignDriver,
  onAssignClick,
  onEndAssignmentClick,
  isEndingAssignment,
}: {
  vehicle: VehicleDto;
  jobs: MaintenanceJob[];
  jobsLoading: boolean;
  alerts: AlertDto[];
  fuelEntries: FuelEntry[];
  onShare: () => void;
  canAssignDriver: boolean;
  onAssignClick: () => void;
  onEndAssignmentClick: () => void;
  isEndingAssignment: boolean;
}) {
  const stats = useMemo(() => buildVehicleDetailStats(jobs, alerts, fuelEntries), [jobs, alerts, fuelEntries]);
  const nextJob = useMemo(() => pickNextPendingMaintenance(jobs), [jobs]);
  const maintenanceHref = ROUTE_PATHS.dashboardMaintenance;
  const declareHref = `${ROUTE_PATHS.dashboardIncidentDeclare}?vehicleId=${encodeURIComponent(vehicle.id)}`;

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 pb-24">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link to={ROUTE_PATHS.dashboardVehicles} aria-label="Retour aux véhicules">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1" />
        <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => void onShare()} aria-label="Partager">
          <Share2 className="h-4 w-4" />
        </Button>
      </div>

      <VehicleHero vehicle={vehicle} declareIncidentHref={declareHref} maintenanceHref={maintenanceHref} />

      {nextJob ? <CountdownBanner job={nextJob} planHref={maintenanceHref} /> : null}

      <KpiBar stats={stats} nextJob={nextJob} />

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <div className="space-y-5">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Historique des interventions</h2>
              <Button variant="secondary" size="sm" asChild>
                <Link to={maintenanceHref}>
                  <Plus className="mr-1.5 h-3 w-3" />
                  Ajouter
                </Link>
              </Button>
            </div>
            {jobsLoading ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">Chargement des interventions…</CardContent>
              </Card>
            ) : (
              <MaintenanceTimeline jobs={jobs} maintenanceHref={maintenanceHref} />
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Historique carburant</h2>
            </div>
            <FuelHistorySection entries={fuelEntries} />
          </section>
        </div>
        <div className="space-y-4">
          <VehicleInfoPanel
            vehicle={vehicle}
            canAssignDriver={canAssignDriver}
            onAssign={onAssignClick}
            onEndAssignment={onEndAssignmentClick}
            isEndingAssignment={isEndingAssignment}
          />
        </div>
      </div>
    </div>
  );
}

export default function FleetVehicleDetailPage() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const { userFleetId } = useAuth();
  const { can } = useRoleAccess();
  const canAssignDriver = can("vehicle.assign_driver");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const { data: vehicle, isLoading: isVehicleLoading } = useVehicleDetail(vehicleId);
  const endAssignment = useEndAssignment();

  useEffect(() => {
    if (!vehicle || !userFleetId) return;
    const label =
      [vehicle.brand, vehicle.model].filter(Boolean).join(" ").trim() || vehicle.registration;
    recordRecentVehicleView({
      vehicleId: vehicle.id,
      fleetId: userFleetId,
      registration: vehicle.registration,
      label,
    });
  }, [vehicle, userFleetId]);
  const { data: vehicleAlerts = [] } = useVehicleAlerts(vehicleId);
  const { data: maintenanceJobs = [], isLoading: jobsLoading } = useVehicleMaintenanceJobs(
    userFleetId ?? undefined,
    vehicleId
  );
  const { data: fuelEntries = [] } = useFuelLogsByVehicle(vehicleId);

  if (!vehicleId) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4 pb-24">
        <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
          <Link to={ROUTE_PATHS.dashboardVehicles}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la liste
          </Link>
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Identifiant de véhicule invalide.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isVehicleLoading && !vehicle) {
    return <FleetVehicleDetailSkeleton />;
  }

  if (!vehicle) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4 pb-24">
        <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
          <Link to={ROUTE_PATHS.dashboardVehicles}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la liste
          </Link>
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Véhicule introuvable dans votre flotte.
          </CardContent>
        </Card>
      </div>
    );
  }

  async function handleShare(): Promise<void> {
    const path = ROUTE_PATHS.dashboardVehicleDetail(vehicle.id);
    const payload = buildVehicleDocumentSharePayload(vehicle, vehicleAlerts, path);
    const { outcome } = await shareContent(payload);
    if (outcome === "shared") {
      toast({
        title: "Partage",
        description: "Le document peut être envoyé via le menu système.",
      });
    } else if (outcome === "copied") {
      toast({
        title: "Copié",
        description: "Le résumé a été copié dans le presse-papiers.",
      });
    } else if (outcome === "unavailable") {
      toast({
        title: "Partage indisponible",
        description: "Impossible d'ouvrir le partage sur cet appareil.",
        variant: "destructive",
      });
    }
  }

  async function handleEndAssignment(): Promise<void> {
    const assignment = vehicle?.active_assignment;
    if (!assignment) return;

    const driverName = assignment.driver?.full_name?.trim() || "ce chauffeur";
    const confirmed = window.confirm(`Delier ${driverName} de ce vehicule ?`);
    if (!confirmed) return;

    try {
      await endAssignment.mutateAsync(assignment.id);
    } catch {
      // Toast handled by the mutation.
    }
  }

  return (
    <>
      <VehicleDetailLoaded
        vehicle={vehicle}
        jobs={maintenanceJobs}
        jobsLoading={jobsLoading}
        alerts={vehicleAlerts}
        fuelEntries={fuelEntries}
        onShare={handleShare}
        canAssignDriver={canAssignDriver}
        onAssignClick={() => setAssignDialogOpen(true)}
        onEndAssignmentClick={handleEndAssignment}
        isEndingAssignment={endAssignment.isPending}
      />
      {canAssignDriver && userFleetId && vehicle.status === "ok" ? (
        <AssignmentFormDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          fleetId={userFleetId}
          preselectedVehicleId={vehicle.id}
        />
      ) : null}
    </>
  );
}
