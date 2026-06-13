"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  FileX,
  MoreHorizontal,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getSignedStorageUrl } from "@/lib/storage/signedUrl";
import {
  DOC_LABELS,
  type DocumentsStats,
  type FleetDocumentRow,
} from "@/lib/dashboard/fetch-documents";
import { canManageVehicles } from "@/lib/dashboard/roles";
import { daysUntil } from "@/lib/days-until";
import { useNowMs } from "@/lib/hooks/use-now-ms";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DocumentUploadDialog } from "@/components/dashboard/document-upload-dialog";

const STORAGE_BUCKET = "incident-evidence";

const STATUS_CONFIG = {
  valid: {
    label: "Valide",
    icon: CheckCircle2,
    className: "bg-green-500/10 text-green-600",
  },
  expiring_soon: {
    label: "Expire bientôt",
    icon: Clock,
    className: "bg-yellow-500/10 text-yellow-700",
  },
  expired: {
    label: "Expiré",
    icon: FileX,
    className: "bg-destructive/10 text-destructive",
  },
  pending_renewal: {
    label: "En renouvellement",
    icon: AlertTriangle,
    className: "bg-primary/10 text-primary",
  },
} as const;

function UrgencyRow({ days }: { days: number | null }) {
  if (days === null) return null;
  if (days < 0) {
    return (
      <span className="text-xs font-medium text-destructive">
        Expiré depuis {Math.abs(days)} j
      </span>
    );
  }
  if (days <= 7) {
    return (
      <span className="text-xs font-medium text-destructive">
        Dans {days} j
      </span>
    );
  }
  if (days <= 30) {
    return (
      <span className="text-xs font-medium text-yellow-700">
        Dans {days} j
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground">Dans {days} j</span>;
}

interface DocumentsManagerProps {
  documents: FleetDocumentRow[];
  stats: DocumentsStats;
  userRole: string;
  fleetId: string;
}

export function DocumentsManager({
  documents,
  stats,
  userRole,
  fleetId,
}: DocumentsManagerProps) {
  const router = useRouter();
  const nowMs = useNowMs();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);

  const canManage = canManageVehicles(userRole);

  const filtered = useMemo(() => {
    return documents.filter((doc) => {
      const ownerLabel = doc.vehicleRegistration
        ? `${doc.vehicleRegistration} ${doc.vehicleBrand ?? ""} ${doc.vehicleModel ?? ""}`
        : (doc.driverName ?? "");
      const label = DOC_LABELS[doc.docType] ?? doc.docType;
      const matchSearch =
        !search ||
        ownerLabel.toLowerCase().includes(search.toLowerCase()) ||
        label.toLowerCase().includes(search.toLowerCase()) ||
        (doc.docNumber ?? "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = !filterStatus || doc.status === filterStatus;
      const matchType = !filterType || doc.docType === filterType;
      return matchSearch && matchStatus && matchType;
    });
  }, [documents, search, filterStatus, filterType]);

  async function openFile(filePath: string | null) {
    if (!filePath) return;
    const url = await getSignedStorageUrl(STORAGE_BUCKET, filePath);
    if (!url) {
      toast.error("Impossible d'ouvrir le fichier.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleDelete(doc: FleetDocumentRow) {
    const label = DOC_LABELS[doc.docType] ?? doc.docType;
    if (!confirm(`Supprimer ce document (${label}) ?`)) return;

    const supabase = createClient();
    const table = doc.source === "vehicle" ? "vehicle_documents" : "driver_licenses";
    const { error } = await supabase.from(table).delete().eq("id", doc.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Document supprimé");
    router.refresh();
  }

  function ownerHref(doc: FleetDocumentRow) {
    if (doc.vehicleId) return `/dashboard/vehicules/${doc.vehicleId}`;
    return "/dashboard/conducteurs";
  }

  function ownerName(doc: FleetDocumentRow) {
    if (doc.vehicleRegistration) {
      return `${doc.vehicleRegistration} · ${[doc.vehicleBrand, doc.vehicleModel].filter(Boolean).join(" ")}`;
    }
    return doc.driverName ?? "—";
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Documents</h1>
          <p className="text-sm text-muted-foreground">
            {stats.total} document{stats.total > 1 ? "s" : ""} · Véhicules &
            conducteurs
          </p>
        </div>
        {canManage ? (
          <Button className="gap-2" onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4" />
            Ajouter un document
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Total",
            value: stats.total,
            className: "border-border bg-card",
            text: "text-foreground",
          },
          {
            label: "Valides",
            value: stats.valid,
            className: "border-green-500/30 bg-green-500/5",
            text: "text-green-600",
          },
          {
            label: "Expire bientôt",
            value: stats.expiring_soon,
            className: "border-yellow-500/30 bg-yellow-500/5",
            text: "text-yellow-700",
          },
          {
            label: "Expirés",
            value: stats.expired,
            className: "border-destructive/30 bg-destructive/5",
            text: "text-destructive",
            alert: stats.expired > 0,
          },
        ].map(({ label, value, className, text, alert }) => (
          <div
            key={label}
            className={cn("rounded-xl border p-3 text-center", className)}
          >
            <p className={cn("text-2xl font-bold tabular-nums", text)}>
              {value}
            </p>
            <p className={cn("mt-0.5 text-xs font-medium opacity-80", text)}>
              {label}
            </p>
            {alert ? (
              <p className="mt-1 text-xs font-semibold text-destructive">
                Action requise
              </p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-40 flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Véhicule, conducteur, type..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={filterStatus || "all"}
          onValueChange={(v) => setFilterStatus(v === "all" ? "" : (v as string))}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="expired">Expirés</SelectItem>
            <SelectItem value="expiring_soon">Expire bientôt</SelectItem>
            <SelectItem value="valid">Valides</SelectItem>
            <SelectItem value="pending_renewal">En renouvellement</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filterType || "all"}
          onValueChange={(v) => setFilterType(v === "all" ? "" : (v as string))}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Tous les types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {Object.entries(DOC_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <FileText className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            {search || filterStatus || filterType
              ? "Aucun document correspondant"
              : "Aucun document — commencez par en ajouter un"}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Propriétaire
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground md:table-cell">
                  Statut
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground lg:table-cell">
                  Expiration
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground xl:table-cell">
                  N° doc
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((doc) => {
                const statusCfg =
                  STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.valid;
                const StatusIcon = statusCfg.icon;
                const daysRemaining =
                  doc.expiresAt && nowMs > 0
                    ? daysUntil(doc.expiresAt, nowMs)
                    : null;

                return (
                  <tr
                    key={doc.id}
                    className={cn(
                      "transition-colors hover:bg-muted/30",
                      doc.status === "expired" && "bg-destructive/5",
                      doc.status === "expiring_soon" && "bg-yellow-500/5",
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                            doc.status === "expired"
                              ? "bg-destructive/10"
                              : doc.status === "expiring_soon"
                                ? "bg-yellow-500/10"
                                : "bg-muted",
                          )}
                        >
                          <FileText
                            className={cn(
                              "h-4 w-4",
                              doc.status === "expired"
                                ? "text-destructive"
                                : doc.status === "expiring_soon"
                                  ? "text-yellow-600"
                                  : "text-muted-foreground",
                            )}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {DOC_LABELS[doc.docType] ?? doc.docType}
                          </p>
                          {doc.issuer ? (
                            <p className="max-w-[120px] truncate text-xs text-muted-foreground">
                              {doc.issuer}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={ownerHref(doc)}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {ownerName(doc)}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {doc.vehicleId ? "Véhicule" : "Conducteur"}
                      </p>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <Badge
                        variant="outline"
                        className={cn("gap-1", statusCfg.className)}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {statusCfg.label}
                      </Badge>
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      {doc.expiresAt ? (
                        <div>
                          <p>{formatDate(doc.expiresAt)}</p>
                          <UrgencyRow days={daysRemaining} />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 font-mono text-xs text-muted-foreground xl:table-cell">
                      {doc.docNumber ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {doc.filePath ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Voir le fichier"
                            onClick={() => void openFile(doc.filePath)}
                          >
                            <ExternalLink className="h-3.5 w-3.5 text-primary" />
                          </Button>
                        ) : null}
                        {canManage ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted">
                              <MoreHorizontal className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => router.push(ownerHref(doc))}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Voir le propriétaire
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => void handleDelete(doc)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {uploadOpen ? (
        <DocumentUploadDialog
          fleetId={fleetId}
          open={uploadOpen}
          hideTrigger
          onClose={() => setUploadOpen(false)}
          onSuccess={() => {
            setUploadOpen(false);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
