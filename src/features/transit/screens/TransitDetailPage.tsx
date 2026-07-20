import { useParams } from "react-router-dom";

export default function TransitDetailPage() {
  const { "*": detailPath } = useParams();

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-semibold">Détail transit</h1>
      <p className="mt-2 text-muted-foreground">
        Chemin transit: {detailPath ?? "non défini"}
      </p>
    </main>
  );
}
