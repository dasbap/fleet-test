import { useParams } from "react-router-dom";
import { useDvirById } from "@/hooks/useDvir";

export default function DvirDetailPage() {
  const { "*": detailPath } = useParams();
  const dvirId = detailPath?.split("/")[0];
  const { data, isLoading } = useDvirById(dvirId);

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-semibold">Détail inspection DVIR</h1>
      <p className="mt-2 text-muted-foreground">Identifiant inspection: {dvirId ?? "non défini"}</p>

      {isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Chargement du détail...</p>
      ) : !data ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Inspection introuvable ou accès non autorisé.
        </p>
      ) : (
        <section className="mt-4 rounded-lg border p-4">
          <p>
            <span className="font-medium">Véhicule :</span> {data.vehicle?.registration ?? "Inconnu"}
          </p>
          <p>
            <span className="font-medium">Inspecteur :</span> {data.inspected_by}
          </p>
          <p>
            <span className="font-medium">Type :</span> {data.inspection_type}
          </p>
          <p>
            <span className="font-medium">Statut :</span> {data.overall_status}
          </p>
          <p>
            <span className="font-medium">Date :</span>{" "}
            {new Date(data.inspected_at).toLocaleString("fr-FR")}
          </p>
          {data.notes ? (
            <p>
              <span className="font-medium">Notes :</span> {data.notes}
            </p>
          ) : null}
        </section>
      )}
    </main>
  );
}
