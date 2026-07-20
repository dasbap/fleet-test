"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  CheckCircle2,
  Edit,
  Eye,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Truck,
  Wrench,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { canDeleteVehicles, canManageVehicles } from "@/lib/dashboard/roles";
import type { FleetOption, VehicleRow } from "@/lib/dashboard/fetch-vehicles";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_CONFIG = {
  ok: {
    label: "Actif",
    icon: CheckCircle2,
    className: "bg-green-500/10 text-green-600 border-green-500/30",
  },
  blocked: {
    label: "Bloqué",
    icon: XCircle,
    className: "bg-destructive/10 text-destructive border-destructive/30",
  },
} as const;

function fleetDotColor(fleetId: string) {
  let hash = 0;
  for (let i = 0; i < fleetId.length; i += 1) {
    hash = fleetId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 65% 45%)`;
}

function driverInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

interface VehiclesTableProps {
  vehicles: VehicleRow[];
  fleets: FleetOption[];
  statusCounts: Record<string, number>;
  userRole: string;
  orgId: string;
  currentFilters: { status?: string; fleet?: string; q?: string };
}

export function VehiclesTable({
  vehicles,
  fleets,
  statusCounts,
  userRole,
  currentFilters,
}: VehiclesTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(currentFilters.q ?? "");
  const [, startTransition] = useTransition();

  const canManage = canManageVehicles(userRole);
  const canDelete = canDeleteVehicles(userRole);
  const total = Object.values(statusCounts).reduce((sum, n) => sum + n, 0);

  function updateFilters(key: string, value: string) {
    const params = new URLSearchParams();
    if (currentFilters.status && key !== "status") {
      params.set("status", currentFilters.status);
    }
    if (currentFilters.fleet && key !== "fleet") {
      params.set("fleet", currentFilters.fleet);
    }
    if (currentFilters.q && key !== "q") {
      params.set("q", currentFilters.q);
    }
    if (value && value !== "all") {
      params.set(key, value);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    updateFilters("q", search);
  }

  async function handleDelete(vehicleId: string, registration: string) {
    if (
      !confirm(
        `Supprimer le véhicule ${registration} ? Cette action est irréversible.`,
      )
    ) {
      return;
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("vehicules")
      .delete()
      .eq("id", vehicleId);

    if (error) {
      toast.error(`Erreur suppression : ${error.message}`);
      return;
    }

    toast.success(`${registration} supprimé`);
    router.refresh();
  }

  async function handleStatusChange(vehicleId: string, status: "ok" | "blocked") {
    const supabase = createClient();
    const { error } = await supabase
      .from("vehicules")
      .update({ status })
      .eq("id", vehicleId);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Statut mis à jour");
    router.refresh();
  }

  const quickFilters = [
    { value: "", label: `Tous (${total})` },
    { value: "ok", label: `Actifs (${statusCounts.ok ?? 0})` },
    { value: "blocked", label: `Bloqués (${statusCounts.blocked ?? 0})` },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Véhicules</h1>
          <p className="text-sm text-muted-foreground">
            {total} véhicule{total > 1 ? "s" : ""} dans votre organisation
          </p>
        </div>
        {canManage ? (
          <Link
            href="/dashboard/vehicules/nouveau"
            className={cn(
              "inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90",
            )}
          >
            <Plus className="h-4 w-4" />
            Ajouter un véhicule
          </Link>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {quickFilters.map(({ value, label }) => (
          <button
            key={value || "all"}
            type="button"
            onClick={() => updateFilters("status", value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              (currentFilters.status ?? "") === value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/50",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <form
          onSubmit={handleSearch}
          className="flex min-w-48 flex-1 gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher par immatriculation..."
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Button type="submit" variant="outline" size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </form>

        {fleets.length > 1 ? (
          <Select
            value={currentFilters.fleet ?? "all"}
            onValueChange={(value) =>
              updateFilters("fleet", value as string)
            }
          >
            <SelectTrigger className="w-44">
              <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Toutes les flottes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les flottes</SelectItem>
              {fleets.map((fleet) => (
                <SelectItem key={fleet.id} value={fleet.id}>
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: fleetDotColor(fleet.id) }}
                    />
                    {fleet.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      {vehicles.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <Truck className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
          <h3 className="mb-1 text-sm font-medium">Aucun véhicule trouvé</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            {currentFilters.q || currentFilters.status || currentFilters.fleet
              ? "Essayez de modifier vos filtres"
              : "Ajoutez votre premier véhicule pour commencer"}
          </p>
          {canManage ? (
            <Link
              href="/dashboard/vehicules/nouveau"
              className="inline-flex h-8 items-center gap-1 rounded-md bg-primary px-3 text-sm text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter un véhicule
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Véhicule</TableHead>
                <TableHead className="hidden md:table-cell">Flotte</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="hidden lg:table-cell">Conducteur</TableHead>
                <TableHead className="hidden xl:table-cell text-right">
                  Kilométrage
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map((vehicle) => {
                const statusCfg =
                  STATUS_CONFIG[
                    vehicle.status as keyof typeof STATUS_CONFIG
                  ] ?? STATUS_CONFIG.blocked;
                const StatusIcon = statusCfg.icon;

                return (
                  <TableRow key={vehicle.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <Truck className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">{vehicle.registration}</p>
                          <p className="text-xs text-muted-foreground">
                            {[vehicle.brand, vehicle.model, vehicle.year]
                              .filter(Boolean)
                              .join(" ")}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="hidden md:table-cell">
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{
                            backgroundColor: fleetDotColor(vehicle.fleet_id),
                          }}
                        />
                        {vehicle.fleet_name}
                      </span>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn("gap-1", statusCfg.className)}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {statusCfg.label}
                      </Badge>
                    </TableCell>

                    <TableCell className="hidden lg:table-cell">
                      {vehicle.driver_name ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="bg-primary/10 text-xs text-primary">
                              {driverInitials(vehicle.driver_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{vehicle.driver_name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Non assigné
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="hidden text-right tabular-nums xl:table-cell">
                      {vehicle.current_km.toLocaleString("fr-FR")} km
                    </TableCell>

                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted">
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/dashboard/vehicules/${vehicle.id}`)
                            }
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Voir la fiche
                          </DropdownMenuItem>
                          {canManage ? (
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(
                                  `/dashboard/vehicules/${vehicle.id}/modifier`,
                                )
                              }
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Modifier
                            </DropdownMenuItem>
                          ) : null}
                          {canManage && vehicle.status === "ok" ? (
                            <DropdownMenuItem
                              onClick={() =>
                                void handleStatusChange(vehicle.id, "blocked")
                              }
                            >
                              <Wrench className="mr-2 h-4 w-4" />
                              Bloquer le véhicule
                            </DropdownMenuItem>
                          ) : null}
                          {canManage && vehicle.status === "blocked" ? (
                            <DropdownMenuItem
                              onClick={() =>
                                void handleStatusChange(vehicle.id, "ok")
                              }
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Remettre en service
                            </DropdownMenuItem>
                          ) : null}
                          {canDelete ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() =>
                                  void handleDelete(
                                    vehicle.id,
                                    vehicle.registration,
                                  )
                                }
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Supprimer
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export type { VehicleRow };
