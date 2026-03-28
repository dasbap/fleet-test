import { useAuth, type AppRole } from "@/hooks/useAuth";
import { OperationsPageHeader } from "@/components/operations/OperationsPageHeader";
import {
  OrganizerOperationsView,
  DriverOperationsView,
  MechanicOperationsView,
  ManagerOperationsView,
} from "@/features/operations/views";

function OperationsBody({ role }: { role: AppRole | null }) {
  const r = role ?? "organizer";

  if (r === "organizer") return <OrganizerOperationsView />;
  if (r === "manager") return <ManagerOperationsView />;
  if (r === "driver") return <DriverOperationsView />;
  if (r === "mechanic") return <MechanicOperationsView />;
  return <OrganizerOperationsView />;
}

/**
 * Page Opérations — contenu et CTA adaptés au rôle.
 * Données : React Query → OperationsService → OperationsRepository (mock jusqu’à branchement API).
 */
export default function OperationsHubPage() {
  const { role } = useAuth();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 sm:space-y-8">
      <OperationsPageHeader role={role} />
      <OperationsBody role={role} />
    </div>
  );
}
