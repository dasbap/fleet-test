import { useCallback, useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const PULL_THRESHOLD_PX = 72;
const MAX_PULL_PX = 120;

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<unknown>;
  className?: string;
  disabled?: boolean;
}

/**
 * Pull-to-refresh tactile pour écrans mobile (Capacitor / PWA).
 */
export function PullToRefresh({
  children,
  onRefresh,
  className,
  disabled = false,
}: PullToRefreshProps) {
  const startY = useRef(0);
  const pulling = useRef(false);
  const [pullPx, setPullPx] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || refreshing) return;
      const scrollTop = (e.currentTarget as HTMLElement).scrollTop;
      if (scrollTop > 0) return;
      startY.current = e.touches[0]?.clientY ?? 0;
      pulling.current = true;
    },
    [disabled, refreshing],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!pulling.current || disabled || refreshing) return;
      const y = e.touches[0]?.clientY ?? 0;
      const delta = Math.max(0, Math.min(MAX_PULL_PX, y - startY.current));
      setPullPx(delta);
    },
    [disabled, refreshing],
  );

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;
    if (pullPx >= PULL_THRESHOLD_PX && !disabled) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
    setPullPx(0);
  }, [pullPx, onRefresh, disabled]);

  return (
    <div
      className={cn("relative min-h-0 flex-1 overflow-y-auto overscroll-y-contain", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => void handleTouchEnd()}
      onTouchCancel={() => {
        pulling.current = false;
        setPullPx(0);
      }}
    >
      <div
        className="pointer-events-none flex items-center justify-center overflow-hidden transition-[height] duration-150"
        style={{ height: refreshing ? 40 : pullPx * 0.5 }}
        aria-hidden={!refreshing && pullPx < 8}
      >
        <Loader2
          className={cn(
            "h-5 w-5 text-primary",
            (refreshing || pullPx >= PULL_THRESHOLD_PX) && "animate-spin",
          )}
        />
      </div>
      {children}
    </div>
  );
}
