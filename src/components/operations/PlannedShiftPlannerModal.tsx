import { FormEvent, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useFleetDrivers } from "@/hooks/useAssignments";
import { useVehicles } from "@/hooks/useVehicles";
import { useCreatePlannedShift } from "@/hooks/usePlannedShifts";

interface PlannedShiftPlannerModalProps {
  fleetId: string;
  /** Pré-sélection conducteur (ex. depuis la liste Conducteurs). */
  defaultDriverUserId?: string;
  /** Pré-sélection véhicule (ex. affectation active). */
  defaultVehicleId?: string;
  /** Mode contrôlé : masque le trigger par défaut si hideTrigger. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

function toIsoFromDateTime(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

/** Modal manager : planifier un créneau conducteur ponctuel. */
export function PlannedShiftPlannerModal({
  fleetId,
  defaultDriverUserId,
  defaultVehicleId,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  hideTrigger = false,
}: PlannedShiftPlannerModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  const { data: drivers = [] } = useFleetDrivers(fleetId);
  const { data: vehicles = [] } = useVehicles(fleetId);
  const createPlanned = useCreatePlannedShift();

  const defaultDate = format(new Date(), "yyyy-MM-dd");
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("12:00");
  const [driverUserId, setDriverUserId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    if (defaultDriverUserId) setDriverUserId(defaultDriverUserId);
    if (defaultVehicleId) setVehicleId(defaultVehicleId);
  }, [open, defaultDriverUserId, defaultVehicleId]);

  const canSubmit = useMemo(
    () => Boolean(driverUserId && vehicleId && date && startTime),
    [driverUserId, vehicleId, date, startTime],
  );

  const resetForm = () => {
    setDate(defaultDate);
    setStartTime("08:00");
    setEndTime("12:00");
    setDriverUserId("");
    setVehicleId("");
    setNotes("");
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const plannedStart = toIsoFromDateTime(date, startTime);
    const plannedEnd = endTime ? toIsoFromDateTime(date, endTime) : null;

    createPlanned.mutate(
      {
        fleet_id: fleetId,
        driver_user_id: driverUserId,
        vehicle_id: vehicleId,
        planned_start: plannedStart,
        planned_end: plannedEnd,
        notes: notes.trim() || null,
      },
      {
        onSuccess: () => {
          setOpen(false);
          resetForm();
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger ? (
        <DialogTrigger asChild>
          <Button size="sm">
            <CalendarPlus className="mr-2 h-4 w-4" aria-hidden />
            Planifier un créneau
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Planifier un créneau</DialogTitle>
          <DialogDescription>
            Définissez un créneau futur pour un conducteur et un véhicule.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="planned-date">Date</Label>
              <Input
                id="planned-date"
                type="date"
                value={date}
                onChange={(ev) => setDate(ev.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="planned-start">Heure début</Label>
              <Input
                id="planned-start"
                type="time"
                value={startTime}
                onChange={(ev) => setStartTime(ev.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="planned-end">Heure fin (optionnel)</Label>
            <Input
              id="planned-end"
              type="time"
              value={endTime}
              onChange={(ev) => setEndTime(ev.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Conducteur</Label>
            <Select value={driverUserId} onValueChange={setDriverUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un conducteur" />
              </SelectTrigger>
              <SelectContent>
                {drivers.map((d) => (
                  <SelectItem key={d.user_id} value={d.user_id}>
                    {d.full_name ?? d.user_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Véhicule</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un véhicule" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.registration}
                    {v.brand ? ` · ${v.brand}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="planned-notes">Notes (optionnel)</Label>
            <Textarea
              id="planned-notes"
              value={notes}
              onChange={(ev) => setNotes(ev.target.value)}
              placeholder="Ex. tournée matinale secteur nord"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={!canSubmit || createPlanned.isPending}>
              {createPlanned.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
