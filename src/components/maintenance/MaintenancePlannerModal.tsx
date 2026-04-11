/**
 * Assistant de planification d'entretien (3 etapes + succes).
 * Persistance : une ligne `travaux_maintenance` ; checklist et montants dans `parts` (jsonb)
 * et details dans `notes`. Les notifications externes ne sont pas branchees cote backend.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addMonths,
  differenceInDays,
  format,
  getDay,
  getDaysInMonth,
  isBefore,
  isSameDay,
  isToday,
  startOfDay,
  startOfMonth,
  subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useCreateMaintenanceJob, type MaintenanceJob } from "@/hooks/useMaintenance";
import { cn } from "@/lib/utils";
import type { VehicleDto } from "@/types/dto/vehicle.dto";

import {
  TYPE_LABELS,
  buildPlannerNotes,
  checklistToParts,
  computePlannedAtIso,
  formatXaf,
  mapUiPriorityToDb,
  type MaintenanceTypeUi,
  type PlanPriorityUi,
} from "./maintenancePlannerPayload";

// --- Types locaux ---

interface Prestataire {
  id: string;
  name: string;
  location: string;
  rating: number;
  availability: string;
}

interface CheckItem {
  id: string;
  label: string;
  priceXaf: number;
  checked: boolean;
  mandatory?: boolean;
}

interface PlanForm {
  type: MaintenanceTypeUi;
  priority: PlanPriorityUi;
  date: Date | null;
  time: string;
  durationH: number;
  notes: string;
}

interface NotifOptions {
  driver: boolean;
  manager: boolean;
  provider: boolean;
}

const PRIORITY_OPTIONS: { value: PlanPriorityUi; label: string }[] = [
  { value: "critical", label: "Critique — immédiat" },
  { value: "high", label: "Haute — cette semaine" },
  { value: "normal", label: "Normale — ce mois" },
  { value: "low", label: "Faible — planifié" },
];

const DURATION_OPTIONS = [
  { value: 2, label: "2 heures" },
  { value: 4, label: "4 heures (demi-journée)" },
  { value: 8, label: "Journée complète" },
  { value: 16, label: "2 jours" },
];

const DEFAULT_REVISION_ITEMS: Omit<CheckItem, "id">[] = [
  { label: "Vidange huile moteur + filtre", priceXaf: 85_000, checked: true, mandatory: true },
  { label: "Filtre à air", priceXaf: 25_000, checked: true },
  { label: "Filtre habitacle", priceXaf: 20_000, checked: true },
  { label: "Contrôle liquides (frein, refroid., dir.)", priceXaf: 45_000, checked: true },
  { label: "Contrôle freins + étriers", priceXaf: 35_000, checked: false },
  { label: "Courroie de distribution", priceXaf: 180_000, checked: false },
  { label: "Diagnostic électronique OBD", priceXaf: 15_000, checked: true },
  { label: "Contrôle géométrie", priceXaf: 30_000, checked: false },
];

const DEFAULT_PRESTATAIRES: Prestataire[] = [
  {
    id: "p1",
    name: "Garage Auto Elite",
    location: "Yaounde Centre",
    rating: 5,
    availability: "Disponible aujourd'hui",
  },
  {
    id: "p2",
    name: "Atelier Toyota CM",
    location: "Yaounde, bd de l'URSS",
    rating: 4,
    availability: "Disponible demain matin",
  },
  {
    id: "p3",
    name: "Centre Revision Express",
    location: "Douala, Akwa",
    rating: 3,
    availability: "Disponible dans 3 jours",
  },
];

const STEP_LABELS = ["Planification", "Prestataire", "Confirmation"];

function MiniCalendar({
  selected,
  onSelect,
  urgentBefore,
}: {
  selected: Date | null;
  onSelect: (d: Date) => void;
  urgentBefore?: Date;
}) {
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const today = new Date();
  const firstDay = startOfMonth(viewMonth);
  const daysCount = getDaysInMonth(viewMonth);
  const startOffset = (getDay(firstDay) + 6) % 7;

  const days = useMemo(() => {
    const result: (Date | null)[] = Array(startOffset).fill(null);
    for (let d = 1; d <= daysCount; d++) {
      result.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));
    }
    return result;
  }, [viewMonth, startOffset, daysCount]);

  return (
    <Card className="border-muted">
      <CardContent className="p-3">
        <div className="mb-3 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMonth((m) => subMonths(m, 1))}
            aria-label="Mois precedent"
          >
            ‹
          </Button>
          <span className="text-sm font-medium capitalize">
            {format(viewMonth, "MMMM yyyy", { locale: fr })}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMonth((m) => addMonths(m, 1))}
            aria-label="Mois suivant"
          >
            ›
          </Button>
        </div>
        <div className="mb-1 grid grid-cols-7 gap-1">
          {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
            <div key={i} className="py-0.5 text-center text-[10px] text-muted-foreground">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            if (!day) return <div key={i} />;
            const isPast = isBefore(day, today) && !isToday(day);
            const isSel = selected && isSameDay(day, selected);
            const isTod = isToday(day);
            const isUrgent = urgentBefore && !isPast && isBefore(day, urgentBefore);

            return (
              <button
                key={i}
                type="button"
                disabled={isPast}
                onClick={() => onSelect(day)}
                className={cn(
                  "h-7 w-full rounded-md text-xs transition-colors",
                  isPast && "cursor-not-allowed opacity-40",
                  !isPast && !isSel && !isTod && !isUrgent && "hover:bg-muted",
                  isTod && !isSel && "border border-primary/50 text-primary",
                  isUrgent && !isSel && "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                  isSel && "bg-primary font-medium text-primary-foreground",
                )}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
        <p
          className={cn(
            "mt-2 text-center text-xs",
            selected ? "text-primary" : "text-muted-foreground",
          )}
        >
          {selected
            ? `Sélectionné : ${format(selected, "d MMMM yyyy", { locale: fr })}`
            : "Aucune date sélectionnée"}
        </p>
      </CardContent>
    </Card>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <span className="text-xs tracking-tight text-amber-500">
      {"★".repeat(n)}
      {"☆".repeat(5 - n)}
    </span>
  );
}

export interface MaintenancePlannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: Pick<VehicleDto, "id" | "fleet_id" | "registration" | "brand" | "model">;
  /** Date ISO du prochain entretien prevu (alerte si depassee). */
  nextMaintenanceAt?: string | null;
  prestataires?: Prestataire[];
  onSuccess?: (job: MaintenanceJob) => void;
}

export function MaintenancePlannerModal({
  open,
  onOpenChange,
  vehicle,
  nextMaintenanceAt = null,
  prestataires = DEFAULT_PRESTATAIRES,
  onSuccess,
}: MaintenancePlannerModalProps) {
  const queryClient = useQueryClient();
  const { userFleetId } = useAuth();
  const createJob = useCreateMaintenanceJob();

  const [step, setStep] = useState<1 | 2 | 3 | "success">(1);
  const [form, setForm] = useState<PlanForm>({
    type: "revision",
    priority: "normal",
    date: null,
    time: "08:00",
    durationH: 4,
    notes: "",
  });
  const [selPrestId, setSelPrestId] = useState<string>(prestataires[0]?.id ?? "");
  const [items, setItems] = useState<CheckItem[]>(() =>
    DEFAULT_REVISION_ITEMS.map((it, i) => ({ ...it, id: `item-${i}` })),
  );
  const [notif, setNotif] = useState<NotifOptions>({
    driver: false,
    manager: false,
    provider: false,
  });

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setForm({
      type: "revision",
      priority: "normal",
      date: null,
      time: "08:00",
      durationH: 4,
      notes: "",
    });
    setSelPrestId(prestataires[0]?.id ?? "");
    setItems(DEFAULT_REVISION_ITEMS.map((it, i) => ({ ...it, id: `item-${i}` })));
    setNotif({ driver: false, manager: false, provider: false });
  }, [open]);

  useEffect(() => {
    setItems(DEFAULT_REVISION_ITEMS.map((it, i) => ({ ...it, id: `item-${i}` })));
  }, [form.type]);

  const urgentBefore = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d;
  }, []);

  const overdueBanner = useMemo(() => {
    if (!nextMaintenanceAt) return null;
    const planned = new Date(nextMaintenanceAt);
    const today = startOfDay(new Date());
    const dayPlanned = startOfDay(planned);
    if (!isBefore(dayPlanned, today) || isSameDay(dayPlanned, today)) return null;
    const days = differenceInDays(today, dayPlanned);
    return {
      days,
      label: format(planned, "d MMMM yyyy", { locale: fr }),
    };
  }, [nextMaintenanceAt]);

  const selPrest = prestataires.find((p) => p.id === selPrestId) ?? null;
  const totalXaf = items.filter((i) => i.checked).reduce((s, i) => s + i.priceXaf, 0);

  const toggleItem = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id && !it.mandatory ? { ...it, checked: !it.checked } : it,
      ),
    );
  }, []);

  const durationLabel =
    DURATION_OPTIONS.find((o) => o.value === form.durationH)?.label ?? `${form.durationH} h`;

  const handleConfirm = async () => {
    if (!form.date) return;
    const notes = buildPlannerNotes({
      typeKey: form.type,
      userNotes: form.notes,
      durationLabel,
      prestataireName: selPrest?.name ?? null,
    });
    const parts = checklistToParts(items);
    const planned_at = computePlannedAtIso(form.date, form.time);
    const priority = mapUiPriorityToDb(form.priority);

    try {
      const job = await createJob.mutateAsync({
        vehicle_id: vehicle.id,
        fleet_id: vehicle.fleet_id,
        priority,
        created_from_incident_id: null,
        notes,
        planned_at,
        parts: parts.length > 0 ? parts : null,
      });

      await queryClient.invalidateQueries({ queryKey: ["maintenance-jobs"] });
      if (userFleetId) {
        await queryClient.invalidateQueries({
          queryKey: ["vehicle", vehicle.id, userFleetId],
        });
      }

      onSuccess?.(job);
      setStep("success");
    } catch {
      /* toast gere dans le hook */
    }
  };

  const handlePlanAnother = () => {
    setStep(1);
    setForm({
      type: "revision",
      priority: "normal",
      date: null,
      time: "08:00",
      durationH: 4,
      notes: "",
    });
    setItems(DEFAULT_REVISION_ITEMS.map((it, i) => ({ ...it, id: `item-${i}` })));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading">
            <Wrench className="h-5 w-5" />
            Planifier un entretien
          </DialogTitle>
          <DialogDescription>
            {vehicle.registration} · {vehicle.brand} {vehicle.model}
          </DialogDescription>
        </DialogHeader>

        {step !== "success" && overdueBanner && (
          <div
            className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            role="status"
          >
            <span>
              Révision prévue dépassée de <strong>{overdueBanner.days} jours</strong>
              <span className="text-muted-foreground"> · {overdueBanner.label}</span>
            </span>
            <span className="ml-auto rounded-full bg-destructive/20 px-2 py-0.5 text-[10px] font-medium">
              Urgent
            </span>
          </div>
        )}

        {step !== "success" && (
          <div className="mb-4 flex items-center gap-2">
            {STEP_LABELS.map((label, i) => {
              const n = i + 1;
              const current = typeof step === "number" ? step : 1;
              const isDone = n < current;
              const isActive = n === current;
              return (
                <div key={label} className="flex flex-1 items-center gap-1">
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                      isDone && "bg-primary text-primary-foreground",
                      isActive && "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background",
                      !isDone && !isActive && "bg-muted text-muted-foreground",
                    )}
                  >
                    {isDone ? "✓" : n}
                  </div>
                  {i < STEP_LABELS.length - 1 && (
                    <div className={cn("h-px flex-1", isDone ? "bg-primary/40" : "bg-border")} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type d&apos;entretien</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm((f) => ({ ...f, type: v as MaintenanceTypeUi }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TYPE_LABELS) as MaintenanceTypeUi[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {TYPE_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priorité</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm((f) => ({ ...f, priority: v as PlanPriorityUi }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Date prévue</Label>
              <MiniCalendar
                selected={form.date}
                onSelect={(d) => setForm((f) => ({ ...f, date: d }))}
                urgentBefore={urgentBefore}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="plan-time">Heure de début</Label>
                <Input
                  id="plan-time"
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Durée estimée</Label>
                <Select
                  value={String(form.durationH)}
                  onValueChange={(v) => setForm((f) => ({ ...f, durationH: Number(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={String(o.value)}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-notes">Notes pour le prestataire</Label>
              <Textarea
                id="plan-notes"
                rows={3}
                placeholder="Ex. : verifier la courroie de distribution…"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => {
                  if (form.date) setStep(2);
                }}
                disabled={!form.date}
              >
                Choisir un prestataire
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">Garage / atelier</p>
            <div className="space-y-2">
              {prestataires.map((p) => {
                const isSel = p.id === selPrestId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelPrestId(p.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                      isSel ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
                    )}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {p.name
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{p.location}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <Stars n={p.rating} />
                        <span className="text-[10px] text-muted-foreground">{p.availability}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="h-px bg-border" />

            <p className="text-xs font-medium uppercase text-muted-foreground">Prestations incluses</p>
            <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => !item.mandatory && toggleItem(item.id)}
                  disabled={item.mandatory}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border p-2.5 text-left text-sm",
                    item.checked ? "border-primary/40 bg-primary/5" : "border-border",
                    item.mandatory && "cursor-not-allowed opacity-90",
                  )}
                >
                  <Checkbox checked={item.checked} disabled className="pointer-events-none" />
                  <span className="flex-1 text-xs">{item.label}</span>
                  {item.mandatory && (
                    <span className="text-[9px] italic text-muted-foreground">obligatoire</span>
                  )}
                  <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                    {formatXaf(item.priceXaf)}
                  </span>
                </button>
              ))}
            </div>

            <Card>
              <CardContent className="space-y-2 p-3 text-sm">
                <p className="text-xs font-medium uppercase text-muted-foreground">Estimation</p>
                {items
                  .filter((i) => i.checked)
                  .map((i) => (
                    <div key={i.id} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{i.label}</span>
                      <span>{formatXaf(i.priceXaf)}</span>
                    </div>
                  ))}
                <div className="flex justify-between border-t pt-2 font-medium">
                  <span>Total estimé</span>
                  <span className="text-primary">{formatXaf(totalXaf)}</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Retour
              </Button>
              <Button type="button" onClick={() => setStep(3)} disabled={!selPrestId}>
                Récapitulatif
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <Card>
              <CardContent className="grid gap-2 p-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Véhicule</p>
                    <p className="font-medium">
                      {vehicle.registration} · {vehicle.brand} {vehicle.model}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Type</p>
                    <p className="font-medium">{TYPE_LABELS[form.type]}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Date</p>
                    <p className="font-medium">
                      {form.date
                        ? `${format(form.date, "d MMMM yyyy", { locale: fr })} à ${form.time}`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Durée</p>
                    <p className="font-medium">{durationLabel}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Prestataire</p>
                    <p className="font-medium">{selPrest?.name ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Coût estimé</p>
                    <p className="font-medium text-primary">{formatXaf(totalXaf)}</p>
                  </div>
                </div>
                {form.notes && (
                  <div className="border-t pt-2">
                    <p className="text-[10px] text-muted-foreground">Notes</p>
                    <p className="text-sm leading-relaxed">{form.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Préférences de notification (non connectées)
              </p>
              <p className="text-xs text-muted-foreground">
                L&apos;envoi SMS / e-mail sera disponible lors du branchement des services externes.
              </p>
              {(
                [
                  ["driver", "Notifier le conducteur (à venir)"],
                  ["manager", "Notifier le gestionnaire de flotte (à venir)"],
                  ["provider", "Transmettre au prestataire (à venir)"],
                ] as const
              ).map(([key, lab]) => (
                <label key={key} className="flex cursor-pointer items-center gap-2">
                  <Checkbox
                    checked={notif[key]}
                    onCheckedChange={(c) =>
                      setNotif((n) => ({ ...n, [key]: c === true }))
                    }
                  />
                  <span className="text-sm">{lab}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-between gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>
                Retour
              </Button>
              <Button type="button" onClick={handleConfirm} disabled={createJob.isPending}>
                {createJob.isPending ? "Enregistrement…" : "Confirmer"}
              </Button>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="space-y-4 py-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary bg-primary/10">
              <span className="text-2xl text-primary">✓</span>
            </div>
            <div>
              <h3 className="font-heading text-lg font-semibold">Intervention planifiée</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {TYPE_LABELS[form.type]} le{" "}
                {form.date ? format(form.date, "d MMMM yyyy", { locale: fr }) : "—"} à {form.time}
                <br />
                Prestataire : {selPrest?.name} · Total estimé : {formatXaf(totalXaf)}
              </p>
            </div>
            {(notif.driver || notif.manager || notif.provider) && (
              <Card className="text-left">
                <CardContent className="space-y-1 p-3 text-xs">
                  <p className="font-medium text-muted-foreground">Preferences enregistrees</p>
                  <p className="text-muted-foreground">
                    Les canaux selectionnes seront utilises lorsque les notifications seront activees.
                  </p>
                </CardContent>
              </Card>
            )}
            <div className="flex flex-wrap justify-center gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Fermer
              </Button>
              <Button type="button" onClick={handlePlanAnother}>
                Planifier un autre entretien
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
