import { Skeleton } from "@/components/ui/skeleton";

/**
 * Placeholder affiché pendant le chargement des segments de route (code-splitting).
 */
export function RoutePageFallback() {
  return (
    <div
      className="flex min-h-[40vh] w-full flex-col gap-4 p-4"
      aria-busy="true"
      aria-label="Chargement de la page"
    >
      <Skeleton className="h-8 w-48 max-w-full" />
      <Skeleton className="h-4 w-full max-w-xl" />
      <Skeleton className="h-4 w-full max-w-lg" />
      <Skeleton className="h-32 w-full max-w-2xl" />
    </div>
  );
}
