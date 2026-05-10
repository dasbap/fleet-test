import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin, Plus, Toggle3D, Trash2, AlertCircle,
  Circle, Pentagon, Bell, BellOff, Loader2, RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale/fr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import {
  useGeofences, useRecentGeofenceEvents,
  useCreateGeofence, useToggleGeofence, useDeleteGeofence,
  type CreateGeofencePayload,
} from "@/hooks/useFleetTracking";
import type { Geofence } from "@/types/gps";

// ─── Carte zone ───────────────────────────────────────────────────────────────
function ZoneCard({
  zone,
  onToggle,
  onDelete,
}: {
  zone: Geofence;
  onToggle: (id: string, fleet_id: string, active: boolean) => void;
  onDelete: (zone: Geofence) => void;
}) {
  const isCircle = zone.geofence_type === "circle";

  return (
    <Card className={zone.is_active ? "" : "opacity-60"}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isCircle
              ? <Circle className="h-4 w-4 text-blue-500 shrink-0" />
              : <Pentagon className="h-4 w-4 text-purple-500 shrink-0" />
            }
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{zone.name}</p>
              {zone.description && (
                <p className="text-xs text-muted-foreground truncate">{zone.description}</p>
              )}
            </div>
          </div>
          <Badge variant={zone.is_active ? "default" : "outline"} className="shrink-0">
            {zone.is_active ? "Actif" : "Inactif"}
          </Badge>
        </div>

        {/* Infos géo */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-muted rounded px-2 py-1.5">
            <p className="text-muted-foreground">Type</p>
            <p className="font-medium capitalize">{zone.geofence_type}</p>
          </div>
          {isCircle && zone.radius_m && (
            <div className="bg-muted rounded px-2 py-1.5">
              <p className="text-muted-foreground">Rayon</p>
              <p className="font-medium">
                {zone.radius_m >= 1000
                  ? `${(zone.radius_m / 1000).toFixed(1)} km`
                  : `${zone.radius_m} m`}
              </p>
            </div>
          )}
          {isCircle && zone.center_lat && zone.center_lng && (
            <div className="bg-muted rounded px-2 py-1.5 col-span-2">
              <p className="text-muted-foreground">Centre</p>
              <p className="font-mono text-xs">
                {zone.center_lat.toFixed(5)}, {zone.center_lng.toFixed(5)}
              </p>
            </div>
          )}
        </div>

        {/* Alertes */}
        <div className="flex items-center gap-3 text-xs">
          <span className={`flex items-center gap-1 ${zone.alert_on_enter ? "text-green-600" : "text-muted-foreground"}`}>
            {zone.alert_on_enter ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
            Entrée
          </span>
          <span className={`flex items-center gap-1 ${zone.alert_on_exit ? "text-orange-600" : "text-muted-foreground"}`}>
            {zone.alert_on_exit ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
            Sortie
          </span>
          {zone.event_count_7d !== undefined && zone.event_count_7d > 0 && (
            <span className="ml-auto text-muted-foreground">
              {zone.event_count_7d} événement{zone.event_count_7d > 1 ? "s" : ""} (7j)
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-1 border-t gap-2">
          <div className="flex items-center gap-2">
            <Switch
              checked={zone.is_active}
              onCheckedChange={(checked) => onToggle(zone.id, zone.fleet_id, checked)}
            />
            <span className="text-xs text-muted-foreground">
              {zone.is_active ? "Activée" : "Désactivée"}
            </span>
          </div>
          <Button
            variant="ghost" size="icon"
            className="text-destructive hover:text-destructive h-8 w-8"
            onClick={() => onDelete(zone)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Formulaire nouvelle zone ────────────────────────────────────────────────
function NewZoneSheet({ fleetId }: { fleetId: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    geofence_type: "circle" as "circle" | "polygon",
    center_lat: "",
    center_lng: "",
    radius_m: "500",
    description: "",
    alert_on_enter: true,
    alert_on_exit: true,
  });
  const { mutate: create, isPending } = useCreateGeofence();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;

    const payload: CreateGeofencePayload = {
      fleet_id: fleetId,
      name: form.name,
      geofence_type: form.geofence_type,
      alert_on_enter: form.alert_on_enter,
      alert_on_exit: form.alert_on_exit,
      description: form.description || undefined,
    };

    if (form.geofence_type === "circle") {
      payload.center_lat = parseFloat(form.center_lat);
      payload.center_lng = parseFloat(form.center_lng);
      payload.radius_m = parseInt(form.radius_m, 10);
    }

    create(payload, {
      onSuccess: () => {
        setOpen(false);
        setForm({ name: "", geofence_type: "circle", center_lat: "", center_lng: "", radius_m: "500", description: "", alert_on_enter: true, alert_on_exit: true });
      },
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-2" />Nouvelle zone</Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader><SheetTitle>Nouvelle zone géographique</SheetTitle></SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="space-y-1.5">
            <Label>Nom *</Label>
            <Input
              placeholder="ex: Zone Port de Douala, Dépôt Yaoundé..."
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input
              placeholder="Informations supplémentaires..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Type de zone</Label>
            <Select
              value={form.geofence_type}
              onValueChange={(v) => setForm((f) => ({ ...f, geofence_type: v as "circle" | "polygon" }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="circle">Cercle (centre + rayon)</SelectItem>
                <SelectItem value="polygon">Polygone (coordonnées)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.geofence_type === "circle" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Latitude</Label>
                  <Input
                    type="number" step="0.00001"
                    placeholder="ex: 3.86667"
                    value={form.center_lat}
                    onChange={(e) => setForm((f) => ({ ...f, center_lat: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Longitude</Label>
                  <Input
                    type="number" step="0.00001"
                    placeholder="ex: 11.51667"
                    value={form.center_lng}
                    onChange={(e) => setForm((f) => ({ ...f, center_lng: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Rayon (mètres)</Label>
                <Input
                  type="number" min="50" step="50"
                  value={form.radius_m}
                  onChange={(e) => setForm((f) => ({ ...f, radius_m: e.target.value }))}
                />
              </div>
            </>
          )}

          <div className="space-y-3 pt-2 border-t">
            <p className="text-sm font-medium">Alertes</p>
            {[
              { key: "alert_on_enter", label: "Alerter à l'entrée de la zone" },
              { key: "alert_on_exit",  label: "Alerter à la sortie de la zone" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3">
                <Switch
                  checked={form[key as "alert_on_enter" | "alert_on_exit"]}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, [key]: v }))}
                />
                <Label className="font-normal">{label}</Label>
              </div>
            ))}
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Créer la zone
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// ─── Page principale ─────────────────────────────────────────────────────────
export default function GeofencingPage() {
  const { userFleetId } = useAuth();
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<Geofence | null>(null);

  const { data: zones = [], isLoading, refetch, isFetching } = useGeofences(userFleetId ?? undefined);
  const { data: events = [] } = useRecentGeofenceEvents(10, userFleetId ?? undefined);
  const { mutate: toggle, isPending: isToggling } = useToggleGeofence();
  const { mutate: deleteZone, isPending: isDeleting } = useDeleteGeofence();

  const activeCount = zones.filter((z) => z.is_active).length;

  return (
    <main className="container mx-auto p-4 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Géofencing</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Zones géographiques et alertes entrée/sortie
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/tracking")}>
            <MapPin className="h-4 w-4 mr-2" />
            Carte live
          </Button>
          <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
          {userFleetId && <NewZoneSheet fleetId={userFleetId} />}
        </div>
      </div>

      {/* KPI */}
      {!isLoading && zones.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="text-center py-3 px-2">
            <p className="text-2xl font-bold">{zones.length}</p>
            <p className="text-xs text-muted-foreground">Zones définies</p>
          </Card>
          <Card className={`text-center py-3 px-2 ${activeCount > 0 ? "border-green-200 bg-green-50" : ""}`}>
            <p className={`text-2xl font-bold ${activeCount > 0 ? "text-green-700" : ""}`}>{activeCount}</p>
            <p className="text-xs text-muted-foreground">Zones actives</p>
          </Card>
          <Card className="text-center py-3 px-2">
            <p className="text-2xl font-bold text-blue-700">{events.length}</p>
            <p className="text-xs text-muted-foreground">Événements récents</p>
          </Card>
        </div>
      )}

      {/* Grille zones */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 space-y-2">
                <div className="h-4 bg-muted rounded w-2/3" />
                <div className="h-8 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : zones.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <MapPin className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium text-lg">Aucune zone définie</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Créez des zones géographiques pour recevoir des alertes lorsque vos véhicules entrent ou sortent de ces zones.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {zones.map((zone) => (
            <ZoneCard
              key={zone.id}
              zone={zone}
              onToggle={(id, fleet_id, active) => toggle({ id, fleet_id, is_active: active })}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* Événements récents */}
      {events.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Événements récents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {events.map((ev) => (
              <div key={ev.id} className="flex items-center gap-3 text-sm py-1.5 border-b last:border-0">
                <Badge
                  variant={ev.event_type === "enter" ? "default" : "secondary"}
                  className="shrink-0 text-xs"
                >
                  {ev.event_type === "enter" ? "Entrée" : "Sortie"}
                </Badge>
                <span className="text-muted-foreground flex-1 truncate text-xs">
                  {ev.vehicle_id.slice(0, 8)}…
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {format(new Date(ev.occurred_at), "d MMM HH:mm", { locale: fr })}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Confirmation suppression */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la zone ?</AlertDialogTitle>
            <AlertDialogDescription>
              La zone <strong>{deleteTarget?.name}</strong> et tous ses événements seront supprimés définitivement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  deleteZone({ id: deleteTarget.id, fleet_id: deleteTarget.fleet_id });
                  setDeleteTarget(null);
                }
              }}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
