import { useState } from "react";
import { ClipboardCheck, Plus, CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/dashboard/PageLoader";
import { useDvirRecent, useCreateDvir, type DvirEntry } from "@/hooks/useDvir";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { InspectionType, OverallStatus } from "@/repositories/dvir.repository";

// ─── Checklist items (standard DVIR Cameroon/Afrique Centrale) ───────────────

const CHECKLIST_ITEMS: { key: string; label: string; category: string }[] = [
  // Sécurité extérieure
  { key: "brakes", label: "Freins", category: "Sécurité" },
  { key: "tyres", label: "Pneus (état + pression)", category: "Sécurité" },
  { key: "lights_front", label: "Phares avant", category: "Sécurité" },
  { key: "lights_rear", label: "Feux arrière + stop", category: "Sécurité" },
  { key: "mirrors", label: "Rétroviseurs", category: "Sécurité" },
  { key: "horn", label: "Klaxon", category: "Sécurité" },
  // Fluides
  { key: "fuel_level", label: "Niveau carburant", category: "Fluides" },
  { key: "oil_level", label: "Niveau huile moteur", category: "Fluides" },
  { key: "coolant", label: "Liquide de refroidissement", category: "Fluides" },
  // Documents
  { key: "insurance", label: "Assurance à bord", category: "Documents" },
  { key: "registration", label: "Carte grise", category: "Documents" },
  { key: "vignette", label: "Vignette en cours", category: "Documents" },
  // Cabine
  { key: "seatbelts", label: "Ceintures de sécurité", category: "Cabine" },
  { key: "windshield", label: "Pare-brise sans fissure", category: "Cabine" },
  { key: "cleanliness", label: "Propreté intérieure", category: "Cabine" },
];

const CATEGORIES = [...new Set(CHECKLIST_ITEMS.map((i) => i.category))];

const STATUS_CONFIG: Record<
  OverallStatus,
  { label: string; icon: React.ElementType; color: string; badgeClass: string }
> = {
  ok: {
    label: "OK",
    icon: CheckCircle2,
    color: "text-emerald-600",
    badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  minor_issues: {
    label: "Problèmes mineurs",
    icon: AlertTriangle,
    color: "text-orange-500",
    badgeClass: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  },
  unsafe: {
    label: "Dangereux",
    icon: XCircle,
    color: "text-red-600",
    badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  },
};

// ─── DVIR entry row ───────────────────────────────────────────────────────────

function DvirEntryRow({ entry }: { entry: DvirEntry }) {
  const cfg = STATUS_CONFIG[entry.overall_status];
  const Icon = cfg.icon;
  const vehicleName =
    [entry.vehicle?.brand, entry.vehicle?.model].filter(Boolean).join(" ") ||
    entry.vehicle?.registration ||
    "—";
  const plate = entry.vehicle?.registration ?? "—";
  const date = new Date(entry.inspected_at).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const typeLabels: Record<InspectionType, string> = {
    pre_trip: "Pré-départ",
    post_trip: "Post-trajet",
    weekly: "Hebdo",
  };
  const failedItems = Object.entries(entry.items).filter(([, v]) => !v).length;

  return (
    <Card>
      <CardContent className="flex items-start gap-3 py-4">
        <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", cfg.color)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm truncate">{vehicleName}</p>
            <Badge className={cfg.badgeClass}>{cfg.label}</Badge>
            <Badge variant="secondary" className="text-xs">{typeLabels[entry.inspection_type]}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{plate} · {date}</p>
          {failedItems > 0 && (
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
              {failedItems} point{failedItems > 1 ? "s" : ""} en défaut
            </p>
          )}
          {entry.notes && (
            <p className="text-xs text-muted-foreground mt-1 italic line-clamp-2">{entry.notes}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── DVIR form dialog ─────────────────────────────────────────────────────────

function DvirFormDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: vehicles = [] } = useFleetVehicles();
  const { mutateAsync, isPending } = useCreateDvir();

  const [vehicleId, setVehicleId] = useState("");
  const [inspectionType, setInspectionType] = useState<InspectionType>("pre_trip");
  const [items, setItems] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(CHECKLIST_ITEMS.map((i) => [i.key, true])),
  );
  const [notes, setNotes] = useState("");
  const [odometerKm, setOdometerKm] = useState("");

  const toggleItem = (key: string) =>
    setItems((prev) => ({ ...prev, [key]: !prev[key] }));

  const failedCount = Object.values(items).filter((v) => !v).length;
  const overallStatus: OverallStatus =
    failedCount === 0 ? "ok" : failedCount <= 2 ? "minor_issues" : "unsafe";

  const handleClose = () => {
    setVehicleId("");
    setItems(Object.fromEntries(CHECKLIST_ITEMS.map((i) => [i.key, true])));
    setNotes("");
    setOdometerKm("");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId) return;
    await mutateAsync({
      vehicle_id: vehicleId,
      inspection_type: inspectionType,
      items,
      overall_status: overallStatus,
      notes: notes || null,
      odometer_km: odometerKm ? Number(odometerKm) : null,
    });
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Contrôle journalier
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Véhicule *</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.registration}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={inspectionType}
                onValueChange={(v) => setInspectionType(v as InspectionType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pre_trip">Pré-départ</SelectItem>
                  <SelectItem value="post_trip">Post-trajet</SelectItem>
                  <SelectItem value="weekly">Hebdomadaire</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-3">
            {CATEGORIES.map((cat) => (
              <div key={cat}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  {cat}
                </p>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {CHECKLIST_ITEMS.filter((i) => i.category === cat).map((item) => (
                    <label
                      key={item.key}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors text-sm",
                        items[item.key]
                          ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
                          : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={items[item.key]}
                        onChange={() => toggleItem(item.key)}
                      />
                      <div
                        className={cn(
                          "h-4 w-4 shrink-0 rounded-sm border flex items-center justify-center",
                          items[item.key]
                            ? "bg-emerald-500 border-emerald-500"
                            : "bg-red-500 border-red-500",
                        )}
                      >
                        {items[item.key] ? (
                          <CheckCircle2 className="h-3 w-3 text-white" />
                        ) : (
                          <XCircle className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <span className={items[item.key] ? "" : "text-red-700 dark:text-red-300 font-medium"}>
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Status summary */}
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
              overallStatus === "ok"
                ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200"
                : overallStatus === "minor_issues"
                ? "bg-orange-50 dark:bg-orange-950/30 text-orange-800 dark:text-orange-200"
                : "bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200",
            )}
          >
            {(() => {
              const Icon = STATUS_CONFIG[overallStatus].icon;
              return <Icon className="h-4 w-4 shrink-0" />;
            })()}
            <span className="font-medium">{STATUS_CONFIG[overallStatus].label}</span>
            {failedCount > 0 && (
              <span className="ml-auto text-xs opacity-80">
                {failedCount} point{failedCount > 1 ? "s" : ""} en défaut
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Odomètre (km)</Label>
              <Input
                type="number"
                min="0"
                placeholder="Ex : 145200"
                value={odometerKm}
                onChange={(e) => setOdometerKm(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Observations</Label>
              <Textarea
                placeholder="Détails sur les défauts constatés…"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={!vehicleId || isPending}>
              {isPending ? "Envoi…" : "Valider le contrôle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DvirPage() {
  const { userFleetId, isLoading: authLoading } = useAuth();
  const { data: entries = [], isLoading } = useDvirRecent(40);
  const [showForm, setShowForm] = useState(false);

  if (authLoading) return <PageLoader />;

  return (
    <div className={cn(mobileScreenRootList, mobileScreenStack)}>
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <h1 className={cn(mobileScreenTitle, "flex items-center gap-2.5")}>
            <ClipboardCheck className="h-7 w-7 shrink-0 text-primary" aria-hidden />
            <span>Contrôles journaliers</span>
          </h1>
          <p className={mobileScreenSubtitle}>
            DVIR — état des véhicules avant et après chaque journée d'exploitation.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-1.5" />
          Contrôle
        </Button>
      </header>

      {isLoading ? (
        <PageLoader />
      ) : !userFleetId ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
            <ClipboardCheck className="h-8 w-8" />
            <p>Aucune flotte sélectionnée.</p>
          </CardContent>
        </Card>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
            <Info className="h-8 w-8" />
            <p className="text-sm">Aucun contrôle journalier enregistré.</p>
            <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Premier contrôle
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {entries.map((entry) => (
            <li key={entry.id}>
              <DvirEntryRow entry={entry} />
            </li>
          ))}
        </ul>
      )}

      <DvirFormDialog open={showForm} onClose={() => setShowForm(false)} />
    </div>
  );
}
