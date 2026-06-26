import { OperationSection } from "@/components/operations/OperationSection";
import { TableauValidations } from "@/components/dashboard/TableauValidations";

interface PendingClosuresSectionProps {
  fleetId: string;
}

/** Section supervision : clôtures de créneau en attente de validation. */
export function PendingClosuresSection({ fleetId }: PendingClosuresSectionProps) {
  return (
    <div id="clotures-en-attente">
      <OperationSection
        title="Clôtures à valider"
        description="Recettes et kilométrages déclarés par les conducteurs en fin de créneau."
      >
        <TableauValidations fleetId={fleetId} />
      </OperationSection>
    </div>
  );
}
