import { useState } from "react";
import { Fuel, Plus, TrendingDown, Droplets, Banknote, Info, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/dashboard/PageLoader";
import { useFuelLogs, useFuelSummary, useFuelAnomalies, type FuelEntry } from "@/hooks/useFuelLogs";
import { useCreateFuelEntry } from "@/hooks/useFuel";
import { useFleetVehicles } from "@/hooks/useDashboardStats";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  mobileScreenRootList,
  mobileScreenStack,
  mobileScreenSubtitle,
  mobileScreenTitle,
} from "@/lib/mobile/mobileUiTokens";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Summary cards ────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className={cn("rounded-lg p-2", color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-lg font-semibold leading-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Fuel entry row ───────────────────────────────────────────────────────────

function FuelEntryRow({ entry, isAnomalous }: { entry: FuelEntry; isAnomalous?: boolean }) {
  const vehicleName = [entry.vehicle?.brand, entry.vehicle?.model]
    .filter(Boolean)
    .join(" ") || entry.vehicle?.registration || "—";
  const plate = entry.vehicle?.registration ?? "—";
  const driver = entry.driver?.full_name ?? "—";
  const date = new Date(entry.purchased_at).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const costPerLiter =
    entry.liters > 0 ? Math.round(entry.amount_xof / entry.liters) : null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{date}</p>
            <p className="font-semibold text-sm leading-tight truncate">{vehicleName}</p>
            <p className="text-xs text-muted-foreground">{plate} · {driver}</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="flex items-center gap-1">
              {isAnomalous && (
                <Badge variant="destructive" className="flex items-center gap-1 text-xs px-1.5 py-0.5">
                  <AlertTriangle className="h-3 w-3" />
                  Surconso.
                </Badge>
              )}
              <Badge variant="secondary">{entry.liters.toFixed(1)} L</Badge>
            </div>
            <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
              {entry.amount_xof.toLocaleString("fr-FR")} XOF
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span>Odomètre : {entry.odometer_km.toLocaleString("fr-FR")} km</span>
          {costPerLiter != null && <span>{costPerLiter.toLocaleString("fr-FR")} XOF/L</span>}
          {entry.station_name && <span>⛽ {entry.station_name}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── New fuel entry dialog ────────────────────────────────────────────────────

function NewFuelEntryDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { data: vehicles = [] } = useFleetVehicles();
  const createEntry = useCreateFuelEntry();

  const [vehicleId, setVehicleId] = useState("");
  const [liters, setLiters] = useState("");
  const [amountXof, setAmountXof] = useState("");
  const [odometerKm, setOdometerKm] = useState("");
  const [stationName, setStationName] = useState("");

  const isValid =
    vehicleId && Number(liters) > 0 && Number(amountXof) >= 0 && Number(odometerKm) >= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    await createEntry.mutateAsync({
      vehicleId,
      liters: Number(liters),
      amountXof: Number(amountXof),
      odometerKm: Number(odometerKm),
      stationName: stationName || null,
    });
    onClose();
    setVehicleId("");
    setLiters("");
    setAmountXof("");
    setOdometerKm("");
    setStationName("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle saisie carburant</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Véhicule *</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un véhicule" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.registration} {v.brand ? `— ${v.brand}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Litres *</Label>
              <Input
                type="number"
                min="0.1"
                step="0.1"
                placeholder="Ex : 45.5"
                value={liters}
                onChange={(e) => setLiters(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Montant (XOF) *</Label>
              <Input
                type="number"
                min="0"
                step="100"
                placeholder="Ex : 27000"
                value={amountXof}
                onChange={(e) => setAmountXof(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Odomètre (km) *</Label>
              <Input
                type="number"
                min="0"
                step="1"
                placeholder="Ex : 128450"
                value={odometerKm}
                onChange={(e) => setOdometerKm(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Station (optionnel)</Label>
              <Input
                placeholder="Ex : Total Bastos"
                value={stationName}
                onChange={(e) => setStationName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={!isValid || createEntry.isPending}
            >
              {createEntry.isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FuelMonitoringPage() {
  const { userFleetId, isLoading: authLoading } = useAuth();
  const { data: entries = [], isLoading: entriesLoading } = useFuelLogs(50);
  const summary = useFuelSummary();
  const flaggedIds = useFuelAnomalies();
  const [showDialog, setShowDialog] = useState(false);

  if (authLoading) return <PageLoader />;

  return (
    <div className={cn(mobileScreenRootList, mobileScreenStack)}>
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <h1 className={cn(mobileScreenTitle, "flex items-center gap-2.5")}>
            <Fuel className="h-7 w-7 shrink-0 text-orange-500" aria-hidden />
            <span>Carburant</span>
          </h1>
          <p className={mobileScreenSubtitle}>
            Suivi des consommations et coûts carburant par véhicule.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowDialog(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-1.5" />
          Saisir
        </Button>
      </header>

      {/* Anomaly banner */}
      {flaggedIds.size > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40 px-4 py-2.5 text-sm text-red-800 dark:text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            <strong>{flaggedIds.size} saisie{flaggedIds.size > 1 ? "s" : ""}</strong> dépassent le seuil de surconsommation (&gt;30 L/100 km).
          </span>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <SummaryCard
          label="Litres total"
          value={`${summary.totalLiters.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} L`}
          icon={Droplets}
          color="bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
        />
        <SummaryCard
          label="Dépense totale"
          value={`${summary.totalAmountXof.toLocaleString("fr-FR")} XOF`}
          icon={Banknote}
          color="bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400"
        />
        <SummaryCard
          label="Coût moyen / L"
          value={
            summary.avgCostPerLiter > 0
              ? `${Math.round(summary.avgCostPerLiter).toLocaleString("fr-FR")} XOF`
              : "—"
          }
          icon={TrendingDown}
          color="bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
        />
      </div>

      {/* List */}
      {entriesLoading ? (
        <PageLoader />
      ) : !userFleetId ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
            <Fuel className="h-8 w-8" />
            <p>Aucune flotte sélectionnée.</p>
          </CardContent>
        </Card>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
            <Info className="h-8 w-8" />
            <p className="text-sm">Aucune saisie carburant enregistrée.</p>
            <Button size="sm" variant="outline" onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Première saisie
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {entries.map((entry) => (
            <li key={entry.id}>
              <FuelEntryRow entry={entry} isAnomalous={flaggedIds.has(entry.id)} />
            </li>
          ))}
        </ul>
      )}

      <NewFuelEntryDialog open={showDialog} onClose={() => setShowDialog(false)} />
    </div>
  );
}
