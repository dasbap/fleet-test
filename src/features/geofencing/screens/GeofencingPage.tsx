import { useState } from "react";
import {
  MapPin, Plus, Trash2, ToggleLeft, ToggleRight,
  Circle, Pentagon, AlertTriangle, Info, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageLoader } from "@/components/dashboard/PageLoader";
import { useAuth } from "@/hooks/useAuth";
import {
  useGeofences, useGeofenceEvents, useCreateGeofence,
  useUpdateGeofence, useDeleteGeofence, type Geofence,
} from "@/hooks/useGeofences";
import { cn } from "@/lib/utils";
import {
  mobileScreenRootList, mobileScreenStack,
  mobileScreenSubtitle, mobileScreenTitle,
} from "@/lib/mobile/mobileUiTokens";

// ─── Zone card ────────────────────────────────────────────────────────────────

function GeofenceCard({
  zone,
  onToggle,
  onDelete,
  isToggling,
  isDeleting,
}: {
  zone: Geofence;
  onToggle: () => void;
  onDelete: () => void;
  isToggling: boolean;
  isDeleting: boolean;
}) {
  const isCircle = zone.geofence_type === "circle";

  return (
    <Card className={cn(!zone.is_active && "opacity-60")}>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {isCircle
              ? <Circle className="h-4 w-4 shrink-0 text-primary" />
              : <Pentagon className="h-4 w-4 shrink-0 text-primary" />}
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{zone.name}</p>
              <p className="text-xs text-muted-foreground">
                {isCircle
                  ? `Cercle · ${zone.radius_m ? `${zone.radius_m} m` : "rayon non défini"}`
                  : "Polygone"}
              </p>
            </div>
          </div>
          <Badge variant={zone.is_active ? "default" : "secondary"} className="shrink-0 text-[0.7rem]">
            {zone.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm" variant="outline"
            className="h-7 text-xs gap-1.5 flex-1"
            onClick={onToggle}
            disabled={isToggling}
          >
            {isToggling
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : zone.is_active
                ? <ToggleLeft className="h-3 w-3" />
                : <ToggleRight className="h-3 w-3" />}
            {zone.is_active ? "Désactiver" : "Activer"}
          </Button>
          <Button
            size="sm" variant="ghost"
            className="h-7 text-xs gap-1.5 text-destructive hover:text-destructive"
            onClick={onDelete}
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            Supprimer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Create dialog ────────────────────────────────────────────────────────────

function CreateGeofenceDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"circle" | "polygon">("circle");
  const [centerLat, setCenterLat] = useState("");
  const [centerLng, setCenterLng] = useState("");
  const [radiusM, setRadiusM] = useState("500");

  const create = useCreateGeofence();

  const handleSubmit = () => {
    if (!name.trim()) return;
    const lat = parseFloat(centerLat);
    const lng = parseFloat(centerLng);
    const radius = parseInt(radiusM, 10);

    if (type === "circle" && (!isFinite(lat) || !isFinite(lng) || !isFinite(radius) || radius <= 0)) return;

    create.mutate(
      {
        name: name.trim(),
        geofence_type: type,
        ...(type === "circle" ? { center_lat: lat, center_lng: lng, radius_m: radius } : {}),
      },
      {
        onSuccess: () => {
          setName(""); setCenterLat(""); setCenterLng(""); setRadiusM("500");
          onClose();
        },
      },
    );
  };

  const canSubmit =
    name.trim().length > 0 &&
    (type !== "circle" ||
      (isFinite(parseFloat(centerLat)) &&
        isFinite(parseFloat(centerLng)) &&
        parseInt(radiusM, 10) > 0));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Nouvelle zone géofencing</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gf-name">Nom de la zone</Label>
            <Input
              id="gf-name"
              placeholder="Ex. Dépôt central Yaoundé"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Type de zone</Label>
            <Select value={type} onValueChange={(v) => setType(v as "circle" | "polygon")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="circle">Cercle (lat/lng + rayon)</SelectItem>
                <SelectItem value="polygon">Polygone (GeoJSON)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === "circle" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="gf-lat">Latitude</Label>
                  <Input
                    id="gf-lat" type="number" step="any"
                    placeholder="3.8480"
                    value={centerLat}
                    onChange={(e) => setCenterLat(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gf-lng">Longitude</Label>
                  <Input
                    id="gf-lng" type="number" step="any"
                    placeholder="11.5021"
                    value={centerLng}
                    onChange={(e) => setCenterLng(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gf-radius">Rayon (mètres)</Label>
                <Input
                  id="gf-radius" type="number" min="50" step="50"
                  placeholder="500"
                  value={radiusM}
                  onChange={(e) => setRadiusM(e.target.value)}
                />
              </div>
            </>
          )}

          {type === "polygon" && (
            <Card className="border-dashed">
              <CardContent className="py-4 text-center text-sm text-muted-foreground">
                La définition polygonale nécessite l'éditeur cartographique
                intégré (bientôt disponible). Utilisez un cercle pour l'instant.
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || create.isPending}>
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Créer la zone
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Events feed ─────────────────────────────────────────────────────────────

function EventsFeed() {
  const { data: events = [], isLoading } = useGeofenceEvents();

  if (isLoading) return <PageLoader />;

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center text-muted-foreground">
          <Info className="h-7 w-7" />
          <p className="text-sm">Aucun événement géofencing récent.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className="space-y-2">
      {events.map((ev) => (
        <li key={ev.id}>
          <Card>
            <CardContent className="py-3 flex items-center gap-3">
              <div className={cn(
                "h-8 w-8 shrink-0 rounded-full flex items-center justify-center",
                ev.event_type === "exit"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30",
              )}>
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {ev.event_type === "exit" ? "Sortie" : "Entrée"} — {ev.geofence?.name ?? "Zone supprimée"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {ev.vehicle?.registration ?? "Véhicule inconnu"} · {new Date(ev.occurred_at).toLocaleString("fr-FR")}
                </p>
              </div>
              <Badge
                variant={ev.event_type === "exit" ? "destructive" : "secondary"}
                className="shrink-0 text-[0.7rem]"
              >
                {ev.event_type === "exit" ? "Sortie" : "Entrée"}
              </Badge>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GeofencingPage() {
  const { userFleetId, isLoading: authLoading } = useAuth();
  const { data: zones = [], isLoading } = useGeofences();
  const toggle = useUpdateGeofence();
  const deleteZone = useDeleteGeofence();

  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Geofence | null>(null);
  const [activeTab, setActiveTab] = useState<"zones" | "events">("zones");

  if (authLoading || isLoading) return <PageLoader />;

  if (!userFleetId) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <MapPin className="h-10 w-10 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Aucune flotte sélectionnée</h2>
            <p className="text-sm text-muted-foreground">
              Rejoignez ou créez une flotte pour gérer les zones géographiques.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeZones = zones.filter((z) => z.is_active);
  const inactiveZones = zones.filter((z) => !z.is_active);

  return (
    <div className={cn(mobileScreenRootList, mobileScreenStack)}>
      {/* En-tête */}
      <header className="space-y-1.5">
        <h1 className={cn(mobileScreenTitle, "flex items-center gap-2.5")}>
          <MapPin className="h-7 w-7 shrink-0 text-primary" aria-hidden />
          <span>Géofencing</span>
        </h1>
        <p className={mobileScreenSubtitle}>
          Définissez des zones géographiques et recevez des alertes automatiques dès qu'un véhicule entre ou sort.
        </p>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Zones totales", value: zones.length, color: "text-foreground" },
          { label: "Actives", value: activeZones.length, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Inactives", value: inactiveZones.length, color: "text-muted-foreground" },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="py-3 text-center">
              <p className={cn("text-2xl font-bold", color)}>{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Onglets */}
      <div className="flex gap-1 border-b">
        {(["zones", "events"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "pb-2 px-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab === "zones" ? "Zones" : "Événements"}
          </button>
        ))}
      </div>

      {activeTab === "zones" && (
        <>
          <Button className="gap-2 self-start" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Nouvelle zone
          </Button>

          {zones.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
                <MapPin className="h-8 w-8" />
                <p className="text-sm">Aucune zone géofencing créée.</p>
                <p className="text-xs">
                  Créez votre première zone pour surveiller les entrées et sorties de véhicules.
                </p>
              </CardContent>
            </Card>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {zones.map((zone) => (
                <li key={zone.id}>
                  <GeofenceCard
                    zone={zone}
                    onToggle={() =>
                      toggle.mutate({ id: zone.id, is_active: !zone.is_active })
                    }
                    onDelete={() => setDeleteTarget(zone)}
                    isToggling={toggle.isPending && toggle.variables?.id === zone.id}
                    isDeleting={deleteZone.isPending && deleteZone.variables === zone.id}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {activeTab === "events" && <EventsFeed />}

      {/* Modale création */}
      <CreateGeofenceDialog open={showCreate} onClose={() => setShowCreate(false)} />

      {/* Confirmation suppression */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la zone ?</AlertDialogTitle>
            <AlertDialogDescription>
              La zone <strong>{deleteTarget?.name}</strong> sera désactivée et n'apparaîtra plus dans les alertes.
              Cette action peut être annulée en la réactivant.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) {
                  deleteZone.mutate(deleteTarget.id);
                  setDeleteTarget(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
