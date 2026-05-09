import * as React from "react";

import { cn } from "@/lib/utils";

export interface SecondaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  fullWidth?: boolean;
  /** Bordure visible (secondaire fort) ou discret (ghost) */
  variant?: "outline" | "ghost";
}

/**
 * Action secondaire : ne rivalise pas avec le primaire ; usage filtres, annuler, moins critique.
 */
export const SecondaryButton = React.forwardRef<HTMLButtonElement, SecondaryButtonProps>(
  ({ className, fullWidth, variant = "outline", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold",
          "touch-manipulation transition-[transform,opacity] active:scale-[0.98]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:pointer-events-none disabled:opacity-50",
          variant === "outline" &&
            "border border-border bg-background text-foreground hover:bg-muted/50 active:bg-muted/70",
          variant === "ghost" && "border border-transparent text-foreground hover:bg-muted/60 active:bg-muted/80",
          fullWidth && "w-full",
          className,
        )}
        {...props}
      />
    );
  },
);
SecondaryButton.displayName = "SecondaryButton";
