"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Car,
  Edit,
  Eye,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Shield,
  Star,
  Trash2,
  UserCheck,
  Users,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { daysUntil } from "@/lib/days-until";
import { useNowMs } from "@/lib/hooks/use-now-ms";
import { getSignedStorageUrl } from "@/lib/storage/signedUrl";
import {
  canDeleteVehicles,
  canManageVehicles,
} from "@/lib/dashboard/roles";
import type {
  DriverDisplayStatus,
  DriverRow,
  DriverStatusCounts,
} from "@/lib/dashboard/fetch-drivers";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const AVATAR_BUCKET = "avatars";

const STATUS_CONFIG: Record<
  DriverDisplayStatus,
  { label: string; className: string; icon: typeof UserCheck }
> = {
  active: {
    label: "Actif",
    className: "bg-green-500/10 text-green-600",
    icon: UserCheck,
  },
  inactive: {
    label: "Inactif",
    className: "bg-muted text-muted-foreground",
    icon: UserX,
  },
  on_leave: {
    label: "Congé",
    className: "bg-yellow-500/10 text-yellow-700",
    icon: AlertTriangle,
  },
};

const OPERATIONAL_LABELS = {
  on_mission: "En mission",
  assigned: "Affecté",
  available: "Disponible",
} as const;

function DriverAvatar({
  driver,
}: {
  driver: Pick<DriverRow, "avatarPath" | "firstName" | "lastName" | "fullName">;
}) {
  const initials = `${driver.firstName?.[0] ?? ""}${driver.lastName?.[0] ?? ""}`.toUpperCase() || "??";
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!driver.avatarPath) return;
    let cancelled = false;
    void getSignedStorageUrl(AVATAR_BUCKET, driver.avatarPath).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [driver.avatarPath]);

  const avatarSrc = driver.avatarPath ? src : null;

  return (
    <Avatar className="h-12 w-12">
      {avatarSrc ? <AvatarImage src={avatarSrc} alt={driver.fullName ?? ""} /> : null}
      <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

function SafetyScore({ score }: { score: number | null }) {
  if (score == null) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const color =
    score >= 8 ? "text-green-600" : score >= 6 ? "text-yellow-600" : "text-destructive";
  return (
    <div className={cn("flex items-center gap-1 text-xs font-bold", color)}>
      <Star className="h-3 w-3 fill-current" />
      {score.toFixed(1)}/10
    </div>
  );
}

function LicenseExpiry({
  date,
  nowMs,
}: {
  date: string | null;
  nowMs: number;
}) {
  if (!date || nowMs <= 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const daysLeft = daysUntil(date, nowMs);
  const color =
    daysLeft < 0
      ? "text-destructive"
      : daysLeft < 30
        ? "text-yellow-600"
        : "text-muted-foreground";
  return (
    <div className={cn("text-xs", color)}>
      {daysLeft < 0
        ? `Expiré (${Math.abs(daysLeft)} j)`
        : daysLeft < 30
          ? `Dans ${daysLeft} j`
          : formatDate(date)}
    </div>
  );
}

interface DriversTableProps {
  drivers: DriverRow[];
  statusCounts: DriverStatusCounts;
  userRole: string;
  fleetId: string;
}

export function DriversTable({
  drivers,
  statusCounts,
  userRole,
  fleetId,
}: DriversTableProps) {
  const router = useRouter();
  const nowMs = useNowMs();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<DriverDisplayStatus | "">("");
  const canManage = canManageVehicles(userRole);
  const canDelete = canDeleteVehicles(userRole);
  const total = drivers.length;

  const filtered = useMemo(() => {
    return drivers.filter((driver) => {
      const fullName = (driver.fullName ?? "").toLowerCase();
      const matchSearch =
        !search ||
        fullName.includes(search.toLowerCase()) ||
        (driver.phone ?? "").includes(search);
      const matchStatus = !filterStatus || driver.displayStatus === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [drivers, search, filterStatus]);

  async function handleDeactivate(driver: DriverRow) {
    const name = driver.fullName ?? "ce conducteur";
    if (!confirm(`Retirer ${name} de la flotte ?`)) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("flotte_adhesions")
      .update({ is_active: false })
      .eq("fleet_id", fleetId)
      .eq("user_id", driver.userId)
      .eq("role", "driver");

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(`${name} retiré de la flotte`);
    router.refresh();
  }

  async function handleStatusChange(
    driver: DriverRow,
    employmentStatus: "active" | "suspended",
  ) {
    const supabase = createClient();

    const { error: profileError } = await supabase
      .from("profils")
      .update({ employment_status: employmentStatus })
      .eq("user_id", driver.userId);

    if (profileError) {
      toast.error(profileError.message);
      return;
    }

    if (employmentStatus === "active" && !driver.isActive) {
      const { error: adhesionError } = await supabase
        .from("flotte_adhesions")
        .update({ is_active: true })
        .eq("fleet_id", fleetId)
        .eq("user_id", driver.userId)
        .eq("role", "driver");

      if (adhesionError) {
        toast.error(adhesionError.message);
        return;
      }
    }

    toast.success("Statut mis à jour");
    router.refresh();
  }

  const filterChips: { value: DriverDisplayStatus | ""; label: string }[] = [
    { value: "", label: `Tous (${total})` },
    { value: "active", label: `Actifs (${statusCounts.active})` },
    { value: "inactive", label: `Inactifs (${statusCounts.inactive})` },
    { value: "on_leave", label: `En congé (${statusCounts.on_leave})` },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Conducteurs</h1>
          <p className="text-sm text-muted-foreground">
            {total} conducteur{total > 1 ? "s" : ""} enregistré
            {total > 1 ? "s" : ""}
          </p>
        </div>
        {canManage ? (
          <Link href="/dashboard/conducteurs/nouveau">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Ajouter un conducteur
            </Button>
          </Link>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {filterChips.map(({ value, label }) => (
          <button
            key={value || "all"}
            type="button"
            onClick={() => setFilterStatus(value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              filterStatus === value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/40",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Nom, téléphone..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <Users className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
          <h3 className="mb-1 text-sm font-medium">Aucun conducteur trouvé</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            {search || filterStatus
              ? "Modifiez votre recherche"
              : "Ajoutez votre premier conducteur"}
          </p>
          {canManage ? (
            <Link href="/dashboard/conducteurs/nouveau">
              <Button size="sm" className="gap-1">
                <Plus className="h-3.5 w-3.5" />
                Ajouter un conducteur
              </Button>
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((driver) => {
            const statusCfg = STATUS_CONFIG[driver.displayStatus];
            const StatusIcon = statusCfg.icon;
            const displayName =
              driver.fullName ??
              ([driver.firstName, driver.lastName].filter(Boolean).join(" ") ||
                "Sans nom");

            return (
              <div
                key={driver.userId}
                className="rounded-xl border bg-card p-4 transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex items-start gap-3">
                  <DriverAvatar driver={driver} />

                  <div className="min-w-0 flex-1">
                    <Link href={`/dashboard/conducteurs/${driver.userId}`}>
                      <p className="truncate font-semibold transition-colors hover:text-primary">
                        {displayName}
                      </p>
                    </Link>
                    {driver.phone ? (
                      <div className="mt-0.5 flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {driver.phone}
                        </span>
                      </div>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      {OPERATIONAL_LABELS[driver.operationalStatus]}
                    </p>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-muted">
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={() =>
                          router.push(`/dashboard/conducteurs/${driver.userId}`)
                        }
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Voir le profil
                      </DropdownMenuItem>
                      {canManage ? (
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(
                              `/dashboard/conducteurs/${driver.userId}/modifier`,
                            )
                          }
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Modifier
                        </DropdownMenuItem>
                      ) : null}
                      {canManage && driver.displayStatus === "active" ? (
                        <DropdownMenuItem
                          onClick={() =>
                            void handleStatusChange(driver, "suspended")
                          }
                        >
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          Mettre en congé
                        </DropdownMenuItem>
                      ) : null}
                      {canManage && driver.displayStatus !== "active" ? (
                        <DropdownMenuItem
                          onClick={() =>
                            void handleStatusChange(driver, "active")
                          }
                        >
                          <UserCheck className="mr-2 h-4 w-4" />
                          Réactiver
                        </DropdownMenuItem>
                      ) : null}
                      {canDelete ? (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => void handleDeactivate(driver)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Retirer de la flotte
                          </DropdownMenuItem>
                        </>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mb-3 flex items-center justify-between">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                      statusCfg.className,
                    )}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {statusCfg.label}
                  </span>
                  <SafetyScore score={driver.safetyScore} />
                </div>

                <div className="mb-2 flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="flex-1">
                    {driver.licenseCategories.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {driver.licenseCategories.map((cat) => (
                          <span
                            key={cat}
                            className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <LicenseExpiry date={driver.licenseExpiresAt} nowMs={nowMs} />
                  </div>
                </div>

                {driver.vehicle ? (
                  <div className="flex items-center gap-2 border-t pt-2">
                    <Car className="h-3.5 w-3.5 text-muted-foreground" />
                    <Link
                      href={`/dashboard/vehicules/${driver.vehicle.id}`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {driver.vehicle.registration} ·{" "}
                      {[driver.vehicle.brand, driver.vehicle.model]
                        .filter(Boolean)
                        .join(" ")}
                    </Link>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 border-t pt-2">
                    <Car className="h-3.5 w-3.5 text-muted-foreground/40" />
                    <span className="text-xs text-muted-foreground">
                      Aucun véhicule assigné
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
