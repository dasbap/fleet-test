import { FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Fuel, Loader2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FicheCreneauActif } from "@/components/terrain/FicheCreneauActif";
import { ClotureCreneau } from "@/components/terrain/ClotureCreneau";
import { OuvertureCreneau } from "@/components/terrain/OuvertureCreneau";
import { useAuth } from "@/hooks/useAuth";
import { useActiveAssignments, type Assignment } from "@/hooks/useAssignments";
import { useActiveShift } from "@/hooks/useDriverShifts";
import { useCreateFuelEntry } from "@/hooks/useFuel";
import { cn } from "@/lib/utils";
import {
  mobileScreenRootList,
  mobileScreenStack,
  mobileScreenSubtitle,
  mobileScreenTitle,
} from "@/lib/mobile/mobileUiTokens";
import { ROUTE_PATHS } from "@/navigation/routePaths";

function parsePositiveNumber(raw: string): number | null {
  const n = Number(String(raw).replace(",", ".").trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/** Hub terrain conducteur : créneau, carburant, lien scan. */
export default function TerrainPage() {
  const { user, userFleetId } = useAuth();
  const { data: rawAssignments } = useActiveAssignments(userFleetId ?? undefined);
  const myAssignment = useMemo(() => {
    const list = rawAssignments ?? [];
    return user ? list.find((a) => a.driver_user_id === user.id) : null;
  }, [rawAssignments, user]);
  const vehicleId = myAssignment?.vehicle_id ?? null;
  const { data: creneauActif } = useActiveShift({ refetchOnWindowFocus: false });
  const createFuel = useCreateFuelEntry();
  const [liters, setLiters] = useState("");
  const [amountXof, setAmountXof] = useState("");
  const [odometerKm, setOdometerKm] = useState("");
  const [stationName, setStationName] = useState("");
  const [receiptRef, setReceiptRef] = useState("");

  const handleFuelSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!vehicleId) return;
    const L = parsePositiveNumber(liters);
    const amount = parsePositiveNumber(amountXof);
    const km = parsePositiveNumber(odometerKm);
    if (L === null || L <= 0 || amount === null || km === null || km < 0) return;
    createFuel.mutate({
      vehicleId,
      liters: L,
      amountXof: amount,
      odometerKm: Math.round(km),
      stationName: stationName.trim() || null,
      receiptRef: receiptRef.trim() || null,
    });
  };

  const fuelLiters = parsePositiveNumber(liters);
  const fuelAmount = parsePositiveNumber(amountXof);
  const fuelKm = parsePositiveNumber(odometerKm);
  const canSubmitFuel =
    Boolean(vehicleId) &&
    fuelLiters !== null &&
    fuelLiters > 0 &&
    fuelAmount !== null &&
    fuelKm !== null &&
    fuelKm >= 0 &&
    !createFuel.isPending;

  return (
    <div className={cn(mobileScreenRootList, mobileScreenStack)}>
      <div>
        <h2 className={mobileScreenTitle}>Terrain</h2>
        <p className={mobileScreenSubtitle}>
          Actions rapides : créneau, carburant et scan QR (sans menu administration).
        </p>
      </div>

      <OuvertureCreneau />
      {creneauActif ? (
        <>
          <FicheCreneauActif creneauId={creneauActif.id} />
          <ClotureCreneau activeShift={creneauActif} successRedirect={ROUTE_PATHS.terrain} />
        </>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <Fuel className="h-4 w-4 text-primary" aria-hidden />
            Saisie carburant
          </CardTitle>
          <CardDescription>Plein ou achat (litres, montant FCFA, kilométrage).</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFuelSubmit} className="space-y-3">
            {!vehicleId ? (
              <p className="text-sm text-muted-foreground">
                Saisie disponible dès qu&apos;un véhicule vous est affecté.
              </p>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="terrain-fuel-liters">Litres</Label>
                    <Input
                      id="terrain-fuel-liters"
                      inputMode="decimal"
                      placeholder="Ex. 40"
                      value={liters}
                      onChange={(ev) => setLiters(ev.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="terrain-fuel-amount">Montant (FCFA)</Label>
                    <Input
                      id="terrain-fuel-amount"
                      inputMode="numeric"
                      placeholder="Ex. 25000"
                      value={amountXof}
                      onChange={(ev) => setAmountXof(ev.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="terrain-fuel-km">Kilométrage compteur</Label>
                  <Input
                    id="terrain-fuel-km"
                    inputMode="numeric"
                    placeholder="Ex. 45280"
                    value={odometerKm}
                    onChange={(ev) => setOdometerKm(ev.target.value)}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="terrain-fuel-station">Station (optionnel)</Label>
                    <Input
                      id="terrain-fuel-station"
                      placeholder="Nom de la station"
                      value={stationName}
                      onChange={(ev) => setStationName(ev.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="terrain-fuel-ref">Réf. ticket (optionnel)</Label>
                    <Input
                      id="terrain-fuel-ref"
                      placeholder="N° ticket"
                      value={receiptRef}
                      onChange={(ev) => setReceiptRef(ev.target.value)}
                    />
                  </div>
                </div>
                <Button type="submit" disabled={!canSubmitFuel}>
                  {createFuel.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  ) : null}
                  Enregistrer le carburant
                </Button>
              </>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <QrCode className="h-4 w-4 text-primary" aria-hidden />
            Scanner QR
          </CardTitle>
          <CardDescription>Ouvrir une fiche véhicule ou pièce depuis un code.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full sm:w-auto" asChild>
            <Link to={ROUTE_PATHS.terrainScan}>
              <QrCode className="mr-2 h-4 w-4" aria-hidden />
              Ouvrir le scanner
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
