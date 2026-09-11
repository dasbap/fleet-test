import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarClock, CreditCard, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import {
  AdminSubscriptionService,
  type AdminSubscriptionGrantOptions,
} from "@/services/admin-subscription.service";

const adminSubscriptionService = new AdminSubscriptionService();

function dateToEndOfDayIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(`${value}T23:59:59.000`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export default function AdminSubscriptionsPage() {
  const { toast } = useToast();
  const { isLoading, isSuperAdmin } = useRoleAccess();
  const [searchParams] = useSearchParams();
  const requestedFleetId = searchParams.get("fleet")?.trim() ?? "";
  const [options, setOptions] = useState<AdminSubscriptionGrantOptions>({ fleets: [], plans: [] });
  const [fleetId, setFleetId] = useState("");
  const [planCode, setPlanCode] = useState("");
  const [vehicleSlots, setVehicleSlots] = useState(1);
  const [expiresOn, setExpiresOn] = useState("");
  const [permanent, setPermanent] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedFleet = useMemo(
    () => options.fleets.find((fleet) => fleet.id === fleetId),
    [fleetId, options.fleets],
  );
  const selectedPlan = useMemo(
    () => options.plans.find((plan) => plan.code === planCode),
    [planCode, options.plans],
  );
  const exceedsPlanLimit = selectedPlan?.maxVehicles != null && vehicleSlots > selectedPlan.maxVehicles;

  async function reloadOptions() {
    setLoadingOptions(true);
    setError(null);
    try {
      const result = await adminSubscriptionService.listGrantOptions();
      setOptions(result);
      setFleetId((current) =>
        current && result.fleets.some((fleet) => fleet.id === current)
          ? current
          : result.fleets[0]?.id || "",
      );
      setPlanCode((current) => current || result.plans[0]?.code || "");
    } catch (reloadError) {
      setError(reloadError instanceof Error ? reloadError.message : "Impossible de charger les options.");
      setOptions({ fleets: [], plans: [] });
      setFleetId("");
    } finally {
      setLoadingOptions(false);
    }
  }

  useEffect(() => {
    if (isLoading || !isSuperAdmin) return;
    let cancelled = false;

    async function loadOptions() {
      setLoadingOptions(true);
      setError(null);
      try {
        const data = await adminSubscriptionService.listGrantOptions();
        if (cancelled) return;
        setOptions(data);
        setFleetId((current) => {
          if (current) return current;
          if (requestedFleetId && data.fleets.some((fleet) => fleet.id === requestedFleetId)) {
            return requestedFleetId;
          }
          return data.fleets[0]?.id || "";
        });
        setPlanCode((current) => current || data.plans[0]?.code || "");
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "Impossible de charger les options.");
        setOptions({ fleets: [], plans: [] });
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    }

    void loadOptions();
    return () => {
      cancelled = true;
    };
  }, [isLoading, isSuperAdmin, requestedFleetId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const expiresAt = permanent ? null : dateToEndOfDayIso(expiresOn);
      await adminSubscriptionService.grantSubscription({
        fleetId,
        planCode,
        expiresAt,
        permanent,
        replaceExisting,
        vehicleSlots,
        planMaxVehicles: selectedPlan?.maxVehicles,
      });
      toast({
        title: "Abonnement attribué",
        description: selectedFleet
          ? `${selectedFleet.name} dispose maintenant du plan ${planCode} pour ${vehicleSlots} véhicule${vehicleSlots > 1 ? "s" : ""}.`
          : `Le plan ${planCode} a été attribué pour ${vehicleSlots} véhicule${vehicleSlots > 1 ? "s" : ""}.`,
      });
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Abonnement non attribué";
      setError(message);
      toast({ title: "Abonnement non attribué", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) return null;
  if (!isSuperAdmin) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <Alert variant="destructive">
          <AlertDescription>
            Seul le super administrateur peut gérer les abonnements. Cette page ne modifie aucun accès pour un administrateur standard.
          </AlertDescription>
        </Alert>
        <Button type="button" variant="outline" onClick={() => window.history.back()}>
          Retour
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CreditCard className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">Abonnements</h1>
            <p className="text-sm text-muted-foreground">Attribution manuelle réservée aux super administrateurs.</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={loadingOptions}
          onClick={() => void reloadOptions()}
          aria-label="Rafraîchir"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
        </Button>
      </header>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="rounded-lg">
        <CardHeader className="flex flex-row items-start gap-3 space-y-0">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
            <CalendarClock className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <CardTitle className="text-base">Donner un abonnement</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Choisissez la flotte, le plan et la date d'expiration.</p>
          </div>
        </CardHeader>
        <CardContent>
          <form className="grid gap-5 md:grid-cols-2" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="fleet">Flotte</Label>
              <Select value={fleetId} onValueChange={setFleetId} disabled={loadingOptions || submitting}>
                <SelectTrigger id="fleet"><SelectValue placeholder="Choisir une flotte" /></SelectTrigger>
                <SelectContent>
                  {options.fleets.map((fleet) => (
                    <SelectItem key={fleet.id} value={fleet.id}>
                      {fleet.name}{fleet.orgName ? ` - ${fleet.orgName}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="plan">Plan</Label>
              <Select value={planCode} onValueChange={setPlanCode} disabled={loadingOptions || submitting}>
                <SelectTrigger id="plan"><SelectValue placeholder="Choisir un plan" /></SelectTrigger>
                <SelectContent>
                  {options.plans.map((plan) => (
                    <SelectItem key={plan.code} value={plan.code}>{plan.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="vehicle-slots">Nombre de véhicules</Label>
              <Input
                id="vehicle-slots"
                type="number"
                min={1}
                max={selectedPlan?.maxVehicles ?? undefined}
                step={1}
                inputMode="numeric"
                value={vehicleSlots}
                disabled={submitting}
                aria-invalid={exceedsPlanLimit}
                required
                onChange={(event) => {
                  const nextValue = Number.parseInt(event.target.value || "1", 10);
                  setVehicleSlots(Number.isFinite(nextValue) ? Math.max(1, nextValue) : 1);
                }}
              />
              {selectedPlan?.maxVehicles != null ? (
                <p className="text-xs text-muted-foreground">
                  Maximum {selectedPlan.maxVehicles} véhicule{selectedPlan.maxVehicles > 1 ? "s" : ""} pour ce plan.
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="expires-on">Date d'expiration</Label>
              <Input
                id="expires-on"
                type="date"
                value={expiresOn}
                disabled={permanent || submitting}
                required={!permanent}
                onChange={(event) => setExpiresOn(event.target.value)}
              />
            </div>

            <div className="flex flex-col justify-end gap-3">
              <label className="flex items-center gap-3 text-sm">
                <Checkbox checked={permanent} disabled={submitting} onCheckedChange={(checked) => setPermanent(checked === true)} />
                <span>Permanent</span>
              </label>
              <label className="flex items-center gap-3 text-sm">
                <Checkbox checked={replaceExisting} disabled={submitting} onCheckedChange={(checked) => setReplaceExisting(checked === true)} />
                <span>Remplacer les abonnements actifs</span>
              </label>
            </div>

            <div className="md:col-span-2">
              <Button
                type="submit"
                className="w-full gap-2"
                disabled={loadingOptions || submitting || !fleetId || !planCode || vehicleSlots <= 0 || exceedsPlanLimit || (!permanent && !expiresOn)}
              >
                <CreditCard className="h-4 w-4" aria-hidden />
                {submitting ? "Attribution..." : "Donner l'abonnement"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
