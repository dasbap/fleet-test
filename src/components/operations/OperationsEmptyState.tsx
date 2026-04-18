import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/mobile/ui";

interface OperationsEmptyStateProps {
  message: string;
  className?: string;
  icon?: ReactNode;
}

/** État vide sobre pour une section Opérations. */
export function OperationsEmptyState({ message, className, icon }: OperationsEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-10 text-center",
        className
      )}
    >
      {icon ? (
        <>
          <div className="text-muted-foreground">{icon}</div>
          <p className="max-w-md text-sm text-muted-foreground">{message}</p>
        </>
      ) : (
        <EmptyState
          icon={Inbox}
          title="Aucune donnée disponible"
          description={message}
          className="py-2"
        />
      )}
    </div>
  );
}
