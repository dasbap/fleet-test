import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import {
  useCreateDvir,
  useDvirById,
  useDvirChecklistConfig,
  useUpdateDvir,
  type DvirDetail,
} from "@/hooks/useDvir";
import { useVehiclesSimple } from "@/hooks/useVehicles";
import { computeOverallDvirStatus, isDvirItemDefect } from "@/lib/dvir-status";
import { cn } from "@/lib/utils";
import type { DvirChecklistConfigItem, DvirInspectionType, DvirItemStatus } from "@/repositories/dvir.repository";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import {
  defaultItemsState,
  DVIR_ITEM_ICONS,
  INSPECTION_TYPE_OPTIONS,
  ITEM_STATUS_LABELS,
  STATUS_BANNER,
} from "./dvirChecklist.constants";

function mergeWithDetail(
  config: DvirChecklistConfigItem[],
  detail: DvirDetail,
): Record<string, { status: DvirItemStatus; note: string }> {
  const base = defaultItemsState(config);
  for (const c of config) {
    const it = detail.items[c.slug];
    if (it) {
      base[c.slug] = {
        status: it.status,
        note: it.note ?? "",
      };
    }
  }
  return base;
}

function countDefects(
  state: Record<string, { status: DvirItemStatus; note: string }>,
  config: DvirChecklistConfigItem[],
): number {
  return config.filter((c) => isDvirItemDefect(state[c.slug]?.status)).length;
}

function ChecklistItemRow({
  item,
  state,
  onStatus,
  onNote,
}: {
  item: DvirChecklistConfigItem;
  state: { status: DvirItemStatus; note: string };
  onStatus: (s: DvirItemStatus) => void;
  onNote: (n: string) => void;
}) {
  const [openNote, setOpenNote] = useState(() => Boolean(state.note?.trim()));
  const isCritical = item.severity === "critical";
  const isDef = isDvirItemDefect(state.status);
  const displayStatuses: DvirItemStatus[] = ["ok", "defaut", "na"];
  const icon = DVIR_ITEM_ICONS[item.slug] ?? "•";

  return (
    <div
      className={cn(
        "rounded-xl border transition-colors",
        isDef && isCritical && "border-destructive/50 bg-destructive/5",
        isDef && !isCritical && "border-warning/50 bg-warning/5",
        !isDef && "border-border bg-card",
      )}
    >
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 md:px-4 md:py-3">
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="w-4 text-right text-[10px] text-muted-foreground">{item.order}</span>
          <span className="text-base leading-none" aria-hidden>
            {icon}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "text-sm font-medium",
                isDef && isCritical && "text-destructive",
                isDef && !isCritical && "text-warning-foreground",
              )}
            >
              {item.label}
            </span>
            {isCritical && (
              <span className="rounded-full border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-destructive">
                Critique
              </span>
            )}
          </div>
          <p className="line-clamp-1 text-[11px] text-muted-foreground">{item.description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {displayStatuses.map((s) => {
            const active = state.status === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  onStatus(s);
                  if (s === "defaut") {
                    setOpenNote(true);
                  }
                }}
                className={cn(
                  "rounded-md border px-2 py-1 text-xs transition-colors",
                  s === "ok" && (active ? "border-success bg-success/15 font-semibold text-success" : "opacity-50"),
                  s === "defaut" &&
                    (isCritical
                      ? active
                        ? "border-destructive bg-destructive/15 font-semibold text-destructive"
                        : "border-destructive/30 text-destructive/80 opacity-50"
                      : active
                        ? "border-warning bg-warning/15 font-semibold text-warning-foreground"
                        : "border-warning/30 text-warning-foreground/80 opacity-50"),
                  s === "na" && (active ? "border-border bg-muted font-semibold" : "opacity-50"),
                )}
              >
                {ITEM_STATUS_LABELS[s].short}
              </button>
            );
          })}
          <button
            type="button"
            className={cn(
              "ml-1 flex h-7 w-7 items-center justify-center rounded-md border text-xs",
              openNote ? "border-primary/40 bg-primary/10" : "border-border text-muted-foreground",
            )}
            onClick={() => setOpenNote((v) => !v)}
            title="Note"
            aria-label="Note"
          >
            📝
          </button>
        </div>
      </div>
      {openNote && (
        <div className="border-t border-border/50 px-3 pb-2.5 pt-2 md:px-4">
          <textarea
            value={state.note}
            onChange={(e) => onNote(e.target.value)}
            rows={2}
            placeholder="Précisez le défaut constaté…"
            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      )}
    </div>
  );
}

export interface DvirChecklistComponentProps {
  mode: "create" | "edit";
  dvirId?: string;
  onSaved?: () => void;
}

export function DvirChecklistComponent({ mode, dvirId, onSaved }: DvirChecklistComponentProps) {
  const navigate = useNavigate();
  const { userFleetId } = useAuth();
  const { data: checklistConfig = [], isLoading: configLoading } = useDvirChecklistConfig();
  const { data: vehicles = [] } = useVehiclesSimple(userFleetId ?? undefined);
  const createMutation = useCreateDvir();
  const updateMutation = useUpdateDvir();

  const { data: existing, isLoading: recordLoading } = useDvirById(mode === "edit" ? dvirId : undefined);

  const [vehicleId, setVehicleId] = useState("");
  const [inspectionType, setInspectionType] = useState<DvirInspectionType>("pre_trip");
  const [odometerKm, setOdometerKm] = useState("");
  const [notes, setNotes] = useState("");
  const [rowState, setRowState] = useState<Record<string, { status: DvirItemStatus; note: string }>>({});
  const [formBootstrapped, setFormBootstrapped] = useState(false);

  // Photos : max 5 fichiers + aperçus en mémoire
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const addPhotos = useCallback((files: FileList | null) => {
    if (!files) return;
    const accepted = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, 5 - photoFiles.length);
    if (accepted.length === 0) return;
    setPhotoFiles((prev) => [...prev, ...accepted].slice(0, 5));
    setPhotoPreviews((prev) => [
      ...prev,
      ...accepted.map((f) => URL.createObjectURL(f)),
    ].slice(0, 5));
  }, [photoFiles.length]);

  const removePhoto = useCallback((idx: number) => {
    setPhotoPreviews((prev) => {
      URL.revokeObjectURL(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
    setPhotoFiles((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const [errors, setErrors] = useState<{ vehicleId?: string; km?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Initialisation create : dès la config dispo
  useEffect(() => {
    if (configLoading || checklistConfig.length === 0 || mode !== "create" || formBootstrapped) {
      return;
    }
    setRowState(defaultItemsState(checklistConfig));
    setFormBootstrapped(true);
  }, [configLoading, checklistConfig, mode, formBootstrapped]);

  // Initialisation édition : enregistrement + config
  useEffect(() => {
    if (configLoading || checklistConfig.length === 0 || mode !== "edit" || !existing) {
      return;
    }
    if (formBootstrapped) {
      return;
    }
    setVehicleId(existing.vehicle_id);
    setInspectionType(existing.inspection_type);
    setOdometerKm(existing.odometer_km != null ? String(existing.odometer_km) : "");
    setNotes(existing.notes ?? "");
    setRowState(mergeWithDetail(checklistConfig, existing));
    setFormBootstrapped(true);
  }, [configLoading, checklistConfig, mode, existing, formBootstrapped]);

  const liveStatus = useMemo(
    () => (Object.keys(rowState).length > 0 ? computeOverallDvirStatus(rowState) : "ok"),
    [rowState],
  );
  const defectCount = useMemo(
    () => (checklistConfig.length > 0 ? countDefects(rowState, checklistConfig) : 0),
    [rowState, checklistConfig],
  );

  const liveBanner = STATUS_BANNER[liveStatus] ?? STATUS_BANNER.ok;
  const progress =
    checklistConfig.length > 0
      ? Math.round(
          (checklistConfig.filter((c) => rowState[c.slug]?.status !== undefined).length /
            checklistConfig.length) *
            100,
        )
      : 0;

  const handleStatus = useCallback((slug: string, s: DvirItemStatus) => {
    setRowState((prev) => {
      const cur = prev[slug] ?? { status: "ok" as DvirItemStatus, note: "" };
      return { ...prev, [slug]: { ...cur, status: s } };
    });
  }, []);

  const handleNote = useCallback((slug: string, n: string) => {
    setRowState((prev) => {
      const cur = prev[slug] ?? { status: "ok" as DvirItemStatus, note: "" };
      return { ...prev, [slug]: { ...cur, note: n } };
    });
  }, []);

  const validate = useCallback((): boolean => {
    const e: { vehicleId?: string; km?: string } = {};
    if (mode === "create" && !vehicleId) {
      e.vehicleId = "Sélectionnez un véhicule";
    }
    if (odometerKm.trim() !== "" && (Number(odometerKm) <= 0 || Number.isNaN(Number(odometerKm)))) {
      e.km = "Kilométrage invalide";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [mode, vehicleId, odometerKm]);

  const buildItemsPayload = useCallback((): Record<string, { status: DvirItemStatus; note?: string }> => {
    const o: Record<string, { status: DvirItemStatus; note?: string }> = {};
    for (const c of checklistConfig) {
      const st = rowState[c.slug] ?? { status: "ok" as const, note: "" };
      o[c.slug] = { status: st.status, note: st.note?.trim() ? st.note.trim() : undefined };
    }
    return o;
  }, [checklistConfig, rowState]);

  const onSubmit = async () => {
    if (!validate()) {
      return;
    }
    setSubmitError(null);
    const odom = odometerKm.trim() === "" ? null : Number(odometerKm);
    const itemsPayload = buildItemsPayload();
    const notesValue = notes.trim() === "" ? null : notes.trim();

    try {
      if (mode === "create") {
        if (!userFleetId) {
          setSubmitError("Aucune flotte active");
          return;
        }
        await createMutation.mutateAsync({
          vehicleId,
          inspectionType,
          odometerKm: odom,
          notes: notesValue,
          items: itemsPayload,
          photoFiles,
        });
        onSaved?.();
        navigate(ROUTE_PATHS.inspections, { replace: true });
        return;
      }
      if (!dvirId) {
        setSubmitError("Identifiant d'inspection manquant");
        return;
      }
      await updateMutation.mutateAsync({
        id: dvirId,
        items: itemsPayload,
        notes: notesValue,
        odometerKm: odom,
        inspectionType,
      });
      onSaved?.();
      navigate(ROUTE_PATHS.inspectionsDetail(dvirId), { replace: true });
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "L'enregistrement a échoué. Vérifiez les droits (édition 24h, auteur).",
      );
    }
  };

  if (configLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (checklistConfig.length === 0) {
    return (
      <p className="p-4 text-sm text-destructive">
        Impossible de charger la configuration de checklist (contacter un administrateur).
      </p>
    );
  }

  if (mode === "edit" && (recordLoading || !formBootstrapped)) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-6">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const criticalItems = checklistConfig.filter((c) => c.severity === "critical");
  const standardItems = checklistConfig.filter((c) => c.severity === "standard");
  const infoItems = checklistConfig.filter((c) => c.severity === "info");

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="mx-auto max-w-3xl space-y-5 py-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">
            {mode === "create" ? "Nouvelle inspection DVIR" : "Modifier l'inspection"}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Contrôle standard — 15 points</p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => navigate(-1)}>
          Retour
        </Button>
      </div>

      <div className="sticky top-0 z-10 space-y-2 border-b border-border/60 bg-background/90 pb-2 pt-1 backdrop-blur">
        <div
          className={cn(
            "rounded-xl border px-3 py-2.5",
            liveBanner.tone === "success" && "border-success/40 bg-success/5",
            liveBanner.tone === "warning" && "border-warning/50 bg-warning/5",
            liveBanner.tone === "destructive" && "border-destructive/50 bg-destructive/10",
          )}
        >
          <div className="flex items-start gap-2">
            {liveBanner.pulse && (
              <span className="relative mt-0.5 flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive/60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
              </span>
            )}
            <div>
              <p
                className={cn(
                  "text-sm font-semibold",
                  liveBanner.tone === "success" && "text-success",
                  liveBanner.tone === "warning" && "text-warning-foreground",
                  liveBanner.tone === "destructive" && "text-destructive",
                )}
              >
                {liveBanner.label}
              </p>
              <p className="text-xs text-muted-foreground">{liveBanner.message}</p>
            </div>
            {defectCount > 0 && (
              <span
                className={cn(
                  "ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold text-primary-foreground",
                  liveStatus === "unsafe" ? "bg-destructive" : "bg-warning",
                )}
              >
                {defectCount} défaut{defectCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>Progression</span>
            <span className="font-medium">
              {checklistConfig.filter((c) => rowState[c.slug]).length}/{checklistConfig.length} points
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-success transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Informations générales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="veh">Véhicule {mode === "create" && "*"}</Label>
            <Select value={vehicleId} onValueChange={setVehicleId} disabled={mode === "edit"}>
              <SelectTrigger id="veh" className={errors.vehicleId ? "border-destructive" : ""}>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    <span className="font-mono">{v.registration}</span>
                    {v.brand ? (
                      <span className="text-muted-foreground"> — {v.brand}</span>
                    ) : null}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.vehicleId && <p className="mt-0.5 text-xs text-destructive">{errors.vehicleId}</p>}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="it">Type d&apos;inspection</Label>
              <Select value={inspectionType} onValueChange={(v) => setInspectionType(v as DvirInspectionType)}>
                <SelectTrigger id="it">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INSPECTION_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="km">Kilométrage (optionnel)</Label>
              <Input
                id="km"
                type="number"
                min={0}
                inputMode="numeric"
                value={odometerKm}
                onChange={(e) => setOdometerKm(e.target.value)}
                className={errors.km ? "border-destructive" : ""}
              />
              {errors.km && <p className="mt-0.5 text-xs text-destructive">{errors.km}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      <ChecklistSection title="Éléments critiques" badge="Immobilisation" badgeTone="destructive" items={criticalItems} state={rowState} onStatus={handleStatus} onNote={handleNote} />
      <ChecklistSection title="Éléments standards" badge="Défauts mineurs" badgeTone="warning" items={standardItems} state={rowState} onStatus={handleStatus} onNote={handleNote} />
      <ChecklistSection title="Propreté & présentation" badge="Info" badgeTone="muted" items={infoItems} state={rowState} onStatus={handleStatus} onNote={handleNote} />

      {/* Section photos défauts */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm">Photos des défauts</CardTitle>
            <span className="text-xs text-muted-foreground">{photoFiles.length}/5</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {photoPreviews.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {photoPreviews.map((url, idx) => (
                <div key={idx} className="relative h-20 w-20 shrink-0">
                  <img
                    src={url}
                    alt={`Photo ${idx + 1}`}
                    className="h-full w-full rounded-lg object-cover border border-border"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-destructive"
                    aria-label="Supprimer la photo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {photoFiles.length < 5 && (
            <>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => addPhotos(e.target.files)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => photoInputRef.current?.click()}
              >
                <Camera className="h-4 w-4" />
                {photoFiles.length === 0 ? "Ajouter des photos" : "Ajouter une photo"}
              </Button>
            </>
          )}
          <p className="text-xs text-muted-foreground">
            Optionnel · JPEG, PNG ou WebP · max 5 Mo par photo
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Notes générales</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Observations globales, conditions, etc."
            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </CardContent>
      </Card>

      {defectCount > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="pt-4 text-xs">
            <p className="mb-1.5 font-semibold text-warning-foreground">Défauts signalés</p>
            <ul className="space-y-1">
              {checklistConfig
                .filter((c) => isDvirItemDefect(rowState[c.slug]?.status))
                .map((c) => (
                  <li key={c.slug} className="flex gap-2 text-muted-foreground">
                    <span className="shrink-0">{DVIR_ITEM_ICONS[c.slug]}</span>
                    <span>
                      {c.label}
                      {rowState[c.slug]?.note ? ` — ${rowState[c.slug].note}` : ""}
                    </span>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {submitError && <p className="text-sm text-destructive">{submitError}</p>}

      <div className="flex flex-col gap-2 pb-6 sm:flex-row sm:items-center sm:gap-3">
        <Button
          type="button"
          className="flex-1"
          onClick={onSubmit}
          disabled={isPending || (mode === "create" && !vehicleId) || !formBootstrapped}
        >
          {isPending
            ? "Enregistrement…"
            : liveStatus === "unsafe"
              ? "Signaler et enregistrer"
              : mode === "create"
                ? "Soumettre l'inspection"
                : "Enregistrer les modifications"}
        </Button>
        <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isPending}>
          Annuler
        </Button>
      </div>
    </div>
  );
}

function ChecklistSection({
  title,
  badge,
  badgeTone,
  items,
  state,
  onStatus,
  onNote,
}: {
  title: string;
  badge: string;
  badgeTone: "destructive" | "warning" | "muted";
  items: DvirChecklistConfigItem[];
  state: Record<string, { status: DvirItemStatus; note: string }>;
  onStatus: (slug: string, s: DvirItemStatus) => void;
  onNote: (slug: string, n: string) => void;
}) {
  if (items.length === 0) {
    return null;
  }
  const badgeCl =
    badgeTone === "destructive"
      ? "border-destructive/30 bg-destructive/10 text-destructive"
      : badgeTone === "warning"
        ? "border-warning/30 bg-warning/5 text-warning-foreground"
        : "border-border bg-muted text-muted-foreground";

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
        <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px]", badgeCl)}>{badge}</span>
      </div>
      <div className="space-y-2">
        {items.map((c) => (
          <ChecklistItemRow
            key={c.slug}
            item={c}
            state={state[c.slug] ?? { status: "ok", note: "" }}
            onStatus={(s) => onStatus(c.slug, s)}
            onNote={(n) => onNote(c.slug, n)}
          />
        ))}
      </div>
    </section>
  );
}
