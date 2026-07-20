import * as React from "react";
import { cn } from "@/lib/utils";

export interface MobileCardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  interactive?: boolean;
}

export const MobileCard: React.FC<MobileCardProps> = ({
  className,
  elevated = false,
  interactive = false,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        "w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground shadow-sm",
        elevated && "shadow-md",
        interactive &&
          "cursor-pointer transition-colors active:bg-muted/60",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

