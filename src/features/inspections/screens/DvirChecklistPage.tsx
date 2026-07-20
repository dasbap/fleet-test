import { useLocation, useParams } from "react-router-dom";
import { DvirChecklistComponent } from "@/features/inspections/components/DvirChecklistComponent";
import { ROUTE_PATHS } from "@/navigation/routePaths";

/**
 * Formulaire checklist DVIR (création / édition) : routes `/inspections/nouveau` et `/inspections/:dvirId/modifier`.
 */
export default function DvirChecklistPage() {
  const { pathname } = useLocation();
  const { dvirId } = useParams<{ dvirId: string }>();
  const isNew = pathname === ROUTE_PATHS.inspectionsNew;

  if (isNew) {
    return (
      <main className="container max-w-4xl px-4">
        <DvirChecklistComponent mode="create" />
      </main>
    );
  }

  if (dvirId) {
    return (
      <main className="container max-w-4xl px-4">
        <DvirChecklistComponent mode="edit" dvirId={dvirId} />
      </main>
    );
  }

  return null;
}
