import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useVehiclesSimple } from "@/hooks/useVehicles";
import { useCreateDvir, useDvirRecent } from "@/hooks/useDvir";
import { ROUTE_PATHS } from "@/navigation/routePaths";

const CRITICAL_ITEM_SLUGS = ["freins_service", "frein_main", "direction", "pneus"];

export default function DvirInspectionsPage() {
  const { userFleetId } = useAuth();
  const [vehicleId, setVehicleId] = useState("");
  const [odometerKm, setOdometerKm] = useState("");
  const { data: vehicles = [] } = useVehiclesSimple(userFleetId ?? undefined);
  const { data: dvirRows = [], isLoading } = useDvirRecent(30);
  const createMutation = useCreateDvir();

  const vehicleMap = useMemo(
    () => new Map(vehicles.map((v) => [v.id, v.registration])),
    [vehicles],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!vehicleId) {
      return;
    }

    const items = Object.fromEntries(
      CRITICAL_ITEM_SLUGS.map((slug) => [slug, { status: "ok" as const }]),
    );

    await createMutation.mutateAsync({
      vehicleId,
      inspectionType: "pre_trip",
      odometerKm: odometerKm ? Number(odometerKm) : null,
      notes: null,
      items,
    });

    setOdometerKm("");
  };

  return (
    <main className="container mx-auto space-y-6 p-4">
      <header>
        <h1 className="text-2xl font-semibold">Inspections DVIR</h1>
        <p className="mt-2 text-muted-foreground">
          Suivi des contrôles journaliers avec statut de conformité.
        </p>
      </header>

      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-medium">Créer un contrôle rapide</h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          Cette saisie rapide crée un pré-contrôle avec items critiques à statut OK.
        </p>
        <form className="grid gap-3 md:grid-cols-3" onSubmit={handleSubmit}>
          <select
            className="rounded border bg-background p-2"
            value={vehicleId}
            onChange={(event) => setVehicleId(event.target.value)}
            required
          >
            <option value="">Sélectionner un véhicule</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.registration}
              </option>
            ))}
          </select>
          <input
            className="rounded border bg-background p-2"
            type="number"
            min={0}
            value={odometerKm}
            onChange={(event) => setOdometerKm(event.target.value)}
            placeholder="Kilométrage (optionnel)"
          />
          <button
            className="rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-60"
            type="submit"
            disabled={createMutation.isPending || !vehicleId}
          >
            {createMutation.isPending ? "Enregistrement..." : "Enregistrer"}
          </button>
        </form>
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-medium">Dernières inspections</h2>
        {isLoading ? (
          <p className="mt-2 text-sm text-muted-foreground">Chargement en cours...</p>
        ) : dvirRows.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Aucune inspection disponible pour la flotte active.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {dvirRows.map((row) => (
              <li key={row.id} className="rounded border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{vehicleMap.get(row.vehicle_id) ?? "Véhicule inconnu"}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(row.inspected_at).toLocaleString("fr-FR")} - statut {row.overall_status}
                    </p>
                  </div>
                  <Link
                    className="text-sm text-primary underline"
                    to={ROUTE_PATHS.inspectionsDetail(row.id)}
                  >
                    Voir détail
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
