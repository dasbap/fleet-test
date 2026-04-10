import RecentActivity from "@/components/dashboard/RecentActivity";

interface Props {
  orgId?: string | null;
}

export function ActivityFeed({ orgId }: Props) {
  return <RecentActivity />;
}
