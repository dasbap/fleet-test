import * as React from "react";
import { cn } from "@/lib/utils";

type MobileButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
type MobileButtonSize = "sm" | "md" | "lg";

export interface MobileButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: MobileButtonVariant;
  size?: MobileButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60";

const sizeClasses: Record<MobileButtonSize, string> = {
  sm: "h-9 px-3",
  md: "h-11 px-4",
  lg: "h-12 px-5 text-base",
};

const variantClasses: Record<MobileButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/95",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70",
  ghost:
    "bg-transparent text-foreground hover:bg-muted active:bg-muted/80",
  destructive:
    "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/95",
};

export const MobileButton: React.FC<MobileButtonProps> = ({
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  leftIcon,
  rightIcon,
  className,
  type = "button",
  children,
  disabled,
  ...props
}) => {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      className={cn(
        baseClasses,
        sizeClasses[size],
        variantClasses[variant],
        fullWidth && "w-full",
        className,
      )}
      disabled={isDisabled}
      {...props}
    >
      {leftIcon ? <span className="shrink-0">{leftIcon}</span> : null}
      <span className="truncate">
        {loading ? "Chargement..." : children}
      </span>
      {rightIcon ? <span className="shrink-0">{rightIcon}</span> : null}
    </button>
  );
};

