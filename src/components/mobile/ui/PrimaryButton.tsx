import * as React from "react";

import { cn } from "@/lib/utils";

export interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Largeur pleine écran (listes, formulaires) */
  fullWidth?: boolean;
  loading?: boolean;
}

/**
 * Bouton principal mobile : contraste fort, cible tactile ≥ 44 px, feedback tactile net.
 */
export const PrimaryButton = React.forwardRef<HTMLButtonElement, PrimaryButtonProps>(
  ({ className, fullWidth, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled || loading}
        className={cn(
          "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5",
          "bg-primary text-sm font-semibold text-primary-foreground",
          "touch-manipulation shadow-sm transition-[transform,opacity] active:scale-[0.98]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:pointer-events-none disabled:opacity-50",
          fullWidth && "w-full",
          className,
        )}
        {...props}
      >
        {loading ? (
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground"
            aria-hidden
          />
        ) : null}
        {children}
      </button>
    );
  },
);
PrimaryButton.displayName = "PrimaryButton";
