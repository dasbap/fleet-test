import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Navigate } from "react-router-dom";
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
import { ROUTE_PATHS } from "@/navigation/routePaths";
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
  const [options, setOptions] = useState<AdminSubscriptionGrantOptions>({
    fleets: [],
    plans: [],
  });
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
        setFleetId((current) => current || data.fleets[0]?.id || "");
        setPlanCode((current) => current || data.plans[0]?.code || "");
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "Impossible de charger les options.");
        setOptions({ fleets: [], plans: [] });
      }
      setLoadingOptions(false);
    }

    void loadOptions();
    return () => {
      cancelled = true;
    };
  }, [isLoading, isSuperAdmin]);

  if (isLoading) return null;
  if (!isSuperAdmin) {
    return <Navigate to={ROUTE_PATHS.dashboardAdmin} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const expiresAt = permanent ? null : dateToEndOfDayIso(expiresOn);
    setSubmitting(true);
    try {
      await adminSubscriptionService.grantSubscription({
        fleetId,
        planCode,
        expiresAt,
        permanent,
        replaceExisting,
        vehicleSlots,
      });
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Abonnement non attribue";
      setError(message);
      toast({
        title: "Abonnement non attribue",
        description: message,
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }
    setSubmitting(false);

    toast({
      title: "Abonnement attribue",
      description: selectedFleet
        ? `${selectedFleet.name} dispose maintenant du plan ${planCode} pour ${vehicleSlots} vehicule${vehicleSlots > 1 ? "s" : ""}.`
        : `Le plan ${planCode} a ete attribue pour ${vehicleSlots} vehicule${vehicleSlots > 1 ? "s" : ""}.`,
    });
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
            <p className="text-sm text-muted-foreground">
              Attribution manuelle reservee aux super administrateurs.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={loadingOptions}
          onClick={() => {
            setFleetId("");
            setPlanCode("");
            setError(null);
            setLoadingOptions(true);
            void adminSubscriptionService.listGrantOptions().then((result) => {
              setOptions(result);
              setFleetId(result.fleets[0]?.id || "");
              setPlanCode(result.plans[0]?.code || "");
              setLoadingOptions(false);
            }).catch((reloadError) => {
              setError(reloadError instanceof Error ? reloadError.message : "Impossible de charger les options.");
              setOptions({ fleets: [], plans: [] });
              setLoadingOptions(false);
            });
          }}
          aria-label="Rafraichir"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
        </Button>
      </header>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="rounded-lg">
        <CardHeader className="flex flex-row items-start gap-3 space-y-0">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
            <CalendarClock className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <CardTitle className="text-base">Donner un abonnement</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Choisissez la flotte, le plan et la date d'expiration.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <form className="grid gap-5 md:grid-cols-2" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="fleet">Flotte</Label>
              <Select
                value={fleetId}
                onValueChange={setFleetId}
                disabled={loadingOptions || submitting}
              >
                <SelectTrigger id="fleet">
                  <SelectValue placeholder="Choisir une flotte" />
                </SelectTrigger>
                <SelectContent>
                  {options.fleets.map((fleet) => (
                    <SelectItem key={fleet.id} value={fleet.id}>
                      {fleet.name}
                      {fleet.orgName ? ` - ${fleet.orgName}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="plan">Plan</Label>
              <Select
                value={planCode}
                onValueChange={setPlanCode}
                disabled={loadingOptions || submitting}
              >
                <SelectTrigger id="plan">
                  <SelectValue placeholder="Choisir un plan" />
                </SelectTrigger>
                <SelectContent>
                  {options.plans.map((plan) => (
                    <SelectItem key={plan.code} value={plan.code}>
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="vehicle-slots">Nombre de vehicules</Label>
              <Input
                id="vehicle-slots"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={vehicleSlots}
                disabled={submitting}
                required
                onChange={(event) => {
                  const nextValue = Number.parseInt(event.target.value || "1", 10);
                  setVehicleSlots(Number.isFinite(nextValue) ? Math.max(1, nextValue) : 1);
                }}
              />
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
                <Checkbox
                  checked={permanent}
                  disabled={submitting}
                  onCheckedChange={(checked) => setPermanent(checked === true)}
                />
                <span>Permanent</span>
              </label>
              <label className="flex items-center gap-3 text-sm">
                <Checkbox
                  checked={replaceExisting}
                  disabled={submitting}
                  onCheckedChange={(checked) => setReplaceExisting(checked === true)}
                />
                <span>Remplacer les abonnements actifs</span>
              </label>
            </div>

            <div className="md:col-span-2">
              <Button
                type="submit"
                className="w-full gap-2"
                disabled={
                  loadingOptions ||
                  submitting ||
                  !fleetId ||
                  !planCode ||
                  vehicleSlots <= 0 ||
                  (!permanent && !expiresOn)
                }
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
