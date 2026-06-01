import { WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface OfflineStateProps {
  title?: string;
  description?: string;
  className?: string;
}

export function OfflineState({
  title = "Hors ligne",
  description = "Les données en cache s'affichent. Reconnectez-vous pour synchroniser.",
  className,
}: OfflineStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-10 text-center px-4",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <WifiOff className="h-9 w-9 text-warning" aria-hidden />
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  );
}
