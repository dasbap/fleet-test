"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit,
  FileText,
  Plus,
  Route,
  Truck,
  Upload,
  Wallet,
  Wrench,
} from "lucide-react";
import { getSignedStorageUrl } from "@/lib/storage/signedUrl";
import { canManageVehicles } from "@/lib/dashboard/roles";
import { DOC_LABELS } from "@/lib/dashboard/fetch-documents";
import type { VehicleDetailData } from "@/lib/dashboard/fetch-vehicle-detail";
import { cn, formatDate, formatXAF } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentUploadDialog } from "@/components/dashboard/document-upload-dialog";

const STORAGE_BUCKET = "incident-evidence";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  ok: { label: "Actif", className: "bg-green-500/10 text-green-600" },
  blocked: { label: "Bloqué", className: "bg-destructive/10 text-destructive" },
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
  critical: "Critique",
};

const EXPENSE_COLORS: Record<string, string> = {
  fuel: "bg-primary/10 text-primary",
  maintenance: "bg-yellow-500/10 text-yellow-700",
  insurance: "bg-purple-500/10 text-purple-700",
  other: "bg-muted text-muted-foreground",
};

const DOC_EMOJI: Record<string, string> = {
  insurance: "🛡️",
  technical_control: "🔧",
  vignette: "📋",
  grey_card: "📄",
  drivers_license: "🪪",
};

interface VehicleDetailProps {
  vehicle: VehicleDetailData;
  fleetId: string;
  userRole: string;
}

function driverInitials(name: string | null) {
  if (!name?.trim()) return "??";
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

export function VehicleDetail({
  vehicle,
  fleetId,
  userRole,
}: VehicleDetailProps) {
  const router = useRouter();
  const [uploadDocOpen, setUploadDocOpen] = useState(false);
  const canManage = canManageVehicles(userRole);

  const statusCfg =
    STATUS_CONFIG[vehicle.status] ?? STATUS_CONFIG.blocked;
  const totalExpenses = vehicle.expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );
  const expiredDocs = vehicle.documents.filter(
    (doc) => doc.status === "expired",
  ).length;
  const expiringDocs = vehicle.documents.filter(
    (doc) => doc.status === "expiring_soon",
  ).length;

  async function openDocument(filePath: string | null) {
    if (!filePath) return;
    const url = await getSignedStorageUrl(STORAGE_BUCKET, filePath);
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link
            href="/dashboard/vehicules"
            className="flex items-center gap-1 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Véhicules
          </Link>
          <span>/</span>
          <span className="font-medium text-foreground">
            {vehicle.registration}
          </span>
        </div>
        {canManage ? (
          <Link href={`/dashboard/vehicules/${vehicle.id}/modifier`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Edit className="h-4 w-4" />
              Modifier
            </Button>
          </Link>
        ) : null}
      </div>

      <div className="rounded-xl border bg-card p-5">
        <div className="flex flex-wrap gap-5">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted">
            <Truck className="h-10 w-10 text-muted-foreground/40" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold">{vehicle.registration}</h1>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-semibold",
                  statusCfg.className,
                )}
              >
                {statusCfg.label}
              </span>
              {expiredDocs > 0 ? (
                <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">
                  {expiredDocs} doc{expiredDocs > 1 ? "s" : ""} expiré
                  {expiredDocs > 1 ? "s" : ""}
                </span>
              ) : null}
            </div>
            <p className="text-base text-muted-foreground">
              {[vehicle.brand, vehicle.model, vehicle.year ? `(${vehicle.year})` : null]
                .filter(Boolean)
                .join(" ")}
            </p>
            {vehicle.fleet ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {vehicle.fleet.name}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-6">
            {[
              {
                label: "Kilométrage",
                value: `${vehicle.current_km.toLocaleString("fr-FR")} km`,
              },
              {
                label: "Dépenses carburant",
                value: formatXAF(totalExpenses),
              },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-lg font-bold tabular-nums">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {vehicle.driver ? (
          <div className="mt-4 flex items-center gap-3 border-t pt-4">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                {driverInitials(vehicle.driver.fullName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">
                {vehicle.driver.fullName ?? "Conducteur"}
              </p>
              <p className="text-xs text-muted-foreground">
                {vehicle.driver.phone ?? "—"} · Conducteur assigné
              </p>
            </div>
            <Link
              href={`/dashboard/conducteurs/${vehicle.driver.userId}`}
              className="ml-auto"
            >
              <span
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "text-xs",
                )}
              >
                Voir le profil →
              </span>
            </Link>
          </div>
        ) : null}

        {vehicle.blocked_reason ? (
          <p className="mt-4 border-t pt-4 text-sm text-destructive">
            Motif de blocage : {vehicle.blocked_reason}
          </p>
        ) : null}
      </div>

      <Tabs defaultValue="documents">
        <TabsList className="h-auto w-full flex-wrap gap-1 p-1">
          {[
            {
              value: "documents",
              label: `Documents (${vehicle.documents.length})`,
              alert: expiredDocs > 0,
            },
            {
              value: "entretien",
              label: `Entretien (${vehicle.maintenance.length})`,
              alert: false,
            },
            {
              value: "trajets",
              label: `Créneaux (${vehicle.trips.length})`,
              alert: false,
            },
            {
              value: "depenses",
              label: "Dépenses",
              alert: false,
            },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="relative text-sm"
            >
              {tab.label}
              {tab.alert ? (
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-destructive" />
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="documents" className="mt-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {expiredDocs > 0 ? (
                <span className="font-medium text-destructive">
                  {expiredDocs} expiré(s) ·{" "}
                </span>
              ) : null}
              {expiringDocs > 0 ? (
                <span className="font-medium text-yellow-700">
                  {expiringDocs} expire bientôt ·{" "}
                </span>
              ) : null}
              {vehicle.documents.length} document(s)
            </p>
            {canManage ? (
              <Button
                size="sm"
                className="gap-2"
                onClick={() => setUploadDocOpen(true)}
              >
                <Upload className="h-4 w-4" />
                Ajouter un document
              </Button>
            ) : null}
          </div>

          {vehicle.documents.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center">
              <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                Aucun document · Ajoutez l&apos;assurance, le contrôle
                technique...
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {vehicle.documents.map((doc) => (
                <div
                  key={doc.id}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-4",
                    doc.status === "expired" && "border-destructive/30 bg-destructive/5",
                    doc.status === "expiring_soon" &&
                      "border-yellow-500/30 bg-yellow-500/5",
                  )}
                >
                  <div className="text-2xl">
                    {DOC_EMOJI[doc.doc_type] ?? "📄"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {DOC_LABELS[doc.doc_type] ?? doc.doc_type}
                    </p>
                    {doc.doc_number ? (
                      <p className="text-xs text-muted-foreground">
                        N° {doc.doc_number}
                      </p>
                    ) : null}
                    {doc.expires_at ? (
                      <p
                        className={cn(
                          "mt-1 text-xs font-medium",
                          doc.status === "expired"
                            ? "text-destructive"
                            : doc.status === "expiring_soon"
                              ? "text-yellow-700"
                              : "text-muted-foreground",
                        )}
                      >
                        {doc.status === "expired" ? "Expiré le" : "Expire le"}{" "}
                        {formatDate(doc.expires_at)}
                      </p>
                    ) : null}
                  </div>
                  {doc.file_path ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => void openDocument(doc.file_path)}
                    >
                      Voir
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="entretien" className="mt-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {vehicle.maintenance.length} enregistrement(s)
            </p>
            {canManage ? (
              <Link href={`/dashboard/vehicules/${vehicle.id}/entretien/nouveau`}>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Ajouter entretien
                </Button>
              </Link>
            ) : null}
          </div>

          <div className="space-y-3">
            {vehicle.maintenance.length === 0 ? (
              <div className="rounded-xl border border-dashed p-10 text-center">
                <Wrench className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  Aucun entretien enregistré
                </p>
              </div>
            ) : (
              vehicle.maintenance.map((job) => (
                <div
                  key={job.id}
                  className="flex items-start gap-4 rounded-xl border bg-card p-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-yellow-500/10">
                    <Wrench className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">
                        Priorité {PRIORITY_LABELS[job.priority] ?? job.priority}
                      </p>
                      <Badge
                        variant="outline"
                        className={
                          job.isCompleted
                            ? "bg-green-500/10 text-green-600"
                            : "bg-yellow-500/10 text-yellow-700"
                        }
                      >
                        {job.isCompleted ? "Terminé" : "Planifié"}
                      </Badge>
                    </div>
                    {job.planned_at ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Planifié le {formatDate(job.planned_at)}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Créé le {formatDate(job.created_at)}
                      </p>
                    )}
                    {job.notes ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {job.notes}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="trajets" className="mt-4">
          <div className="overflow-hidden rounded-xl border">
            {vehicle.trips.length === 0 ? (
              <div className="p-10 text-center">
                <Route className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  Aucun créneau enregistré
                </p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                      Date
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground md:table-cell">
                      Conducteur
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                      Distance
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                      Statut
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {vehicle.trips.map((trip) => (
                    <tr key={trip.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(trip.started_at)}
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        {trip.driverName ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {trip.distance_km != null
                          ? `${trip.distance_km} km`
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            trip.displayStatus === "completed"
                              ? "bg-green-500/10 text-green-600"
                              : trip.displayStatus === "in_progress"
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground",
                          )}
                        >
                          {trip.displayStatus === "completed"
                            ? "Terminé"
                            : trip.displayStatus === "in_progress"
                              ? "En cours"
                              : trip.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="depenses" className="mt-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Total carburant :{" "}
              <span className="font-semibold text-foreground">
                {formatXAF(totalExpenses)}
              </span>
            </p>
          </div>

          <div className="space-y-2">
            {vehicle.expenses.length === 0 ? (
              <div className="rounded-xl border border-dashed p-10 text-center">
                <Wallet className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  Aucune dépense enregistrée
                </p>
              </div>
            ) : (
              vehicle.expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3"
                >
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-semibold",
                      EXPENSE_COLORS[expense.category] ?? EXPENSE_COLORS.other,
                    )}
                  >
                    {expense.category === "fuel" ? "Carburant" : expense.category}
                  </span>
                  <p className="flex-1 truncate text-sm text-muted-foreground">
                    {expense.description ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(expense.date)}
                  </p>
                  <p className="text-sm font-semibold tabular-nums">
                    {formatXAF(expense.amount)}
                  </p>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {uploadDocOpen ? (
        <DocumentUploadDialog
          fleetId={fleetId}
          vehicleId={vehicle.id}
          driverUserId={vehicle.driver?.userId}
          open={uploadDocOpen}
          hideTrigger
          onClose={() => setUploadDocOpen(false)}
          onSuccess={() => {
            setUploadDocOpen(false);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
