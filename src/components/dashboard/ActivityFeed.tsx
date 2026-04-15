import { lazy, Suspense } from "react";
import { ActivityFeedSkeleton } from "@/components/dashboard/ActivityFeedSkeleton";

interface Props {
  orgId?: string | null;
}

const RecentActivityLazy = lazy(() => import("@/components/dashboard/RecentActivity"));

export function ActivityFeed({ orgId: _orgId }: Props) {
  return (
    <div className="min-h-[26rem]">
      <Suspense fallback={<ActivityFeedSkeleton />}>
        <RecentActivityLazy />
      </Suspense>
    </div>
  );
}
