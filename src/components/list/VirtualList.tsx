import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";

interface VirtualListProps<T> {
  items: T[];
  estimateSize?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  maxHeight?: string;
  getItemKey?: (item: T, index: number) => string | number;
}

/**
 * Liste virtualisée pour longues collections (véhicules, alertes).
 */
export function VirtualList<T>({
  items,
  estimateSize = 72,
  renderItem,
  className,
  maxHeight = "min(70vh, 640px)",
  getItemKey,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 8,
    getItemKey: getItemKey
      ? (index) => getItemKey(items[index]!, index)
      : (index) => index,
  });

  if (items.length <= 50) {
    return (
      <ul className={cn("space-y-2", className)} role="list">
        {items.map((item, i) => (
          <li key={getItemKey?.(item, i) ?? i}>{renderItem(item, i)}</li>
        ))}
      </ul>
    );
  }

  return (
    <div
      ref={parentRef}
      className={cn("overflow-y-auto overscroll-y-contain", className)}
      style={{ maxHeight }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((vItem) => (
          <div
            key={vItem.key}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${vItem.start}px)`,
            }}
          >
            {renderItem(items[vItem.index]!, vItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
