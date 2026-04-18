import FleetOverview from "@/components/dashboard/FleetOverview";

interface Props {
  orgId?: string | null;
}

export function FleetTable({ orgId }: Props) {
  return <FleetOverview />;
}
