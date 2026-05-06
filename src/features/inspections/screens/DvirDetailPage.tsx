import { Link, useParams } from "react-router-dom";
import { useDvirById } from "@/hooks/useDvir";
import { ROUTE_PATHS } from "@/navigation/routePaths";

const STATUS_LABELS: Record<string, string> = {
  ok: "Conforme",
  minor_issues: "Défauts mineurs",
  defects_noted: "Défauts notés",
  unsafe: "Non sécuritaire",
};

const ITEM_STATUS_LABELS: Record<string, string> = {
  ok: "OK",
  defaut: "Défaut",
  defect: "Défaut",
  na: "N/A",
};

export default function DvirDetailPage() {
  const { "*": detailPath } = useParams();
  // Splat route : le premier segment est l'UUID de l'inspection
  const dvirId = detailPath?.split("/")[0] || undefined;

  const { data, isLoading, isError } = useDvirById(dvirId);

  const itemEntries = data ? Object.entries(data.items) : [];

  return (
    <main className="container mx-auto space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Détail inspection DVIR</h1>
        {dvirId ? (
          <Link to={ROUTE_PATHS.inspectionsEdit(dvirId)} className="text-sm font-medium text-primary underline">
            Modifier
          </Link>
        ) : null}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement du détail...</p>
      ) : isError ? (
        <p className="text-sm text-destructive" role="alert">
          Erreur lors du chargement. Veuillez réessayer.
        </p>
      ) : !data ? (
        <p className="text-sm text-muted-foreground">
          Inspection introuvable ou accès non autorisé.
        </p>
      ) : (
        <>
          <section className="rounded-lg border p-4 space-y-1">
            <p><span className="font-medium">Véhicule :</span> {data.vehicle_registration ?? "Inconnu"}</p>
            <p><span className="font-medium">Inspecteur :</span> {data.inspector_name ?? data.inspected_by}</p>
            <p><span className="font-medium">Type :</span> {data.inspection_type}</p>
            <p>
              <span className="font-medium">Statut :</span>{" "}
              {STATUS_LABELS[data.overall_status] ?? data.overall_status}
            </p>
            <p>
              <span className="font-medium">Date :</span>{" "}
              {new Date(data.inspected_at).toLocaleString("fr-FR")}
            </p>
            {data.odometer_km != null ? (
              <p><span className="font-medium">Kilométrage :</span> {data.odometer_km.toLocaleString("fr-FR")} km</p>
            ) : null}
            {data.notes ? (
              <p><span className="font-medium">Notes :</span> {data.notes}</p>
            ) : null}
          </section>

          {itemEntries.length > 0 ? (
            <section className="rounded-lg border p-4">
              <h2 className="mb-3 text-lg font-medium">Points de contrôle ({itemEntries.length})</h2>
              <ul className="divide-y text-sm">
                {itemEntries.map(([slug, item]) => (
                  <li key={slug} className="flex items-start justify-between gap-2 py-2">
                    <span className="font-mono text-xs text-muted-foreground">{slug}</span>
                    <div className="text-right">
                      <span
                        className={
                          item.status === "ok"
                            ? "text-green-600 font-medium"
                            : item.status === "na"
                              ? "text-muted-foreground"
                              : "text-destructive font-medium"
                        }
                      >
                        {ITEM_STATUS_LABELS[item.status] ?? item.status}
                      </span>
                      {item.note ? (
                        <p className="text-muted-foreground">{item.note}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </main>
  );
}
