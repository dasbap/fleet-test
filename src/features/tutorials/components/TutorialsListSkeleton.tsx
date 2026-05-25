import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function TutorialsListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i}>
          <Card>
            <CardContent className="space-y-3 p-0">
              <Skeleton className="aspect-video w-full rounded-none" />
              <div className="space-y-2 px-3 pb-3">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
