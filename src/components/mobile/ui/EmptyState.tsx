import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import { PrimaryButton } from "./PrimaryButton";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * État vide neutre B2B : pas de marketing, message clair + action optionnelle.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-2 py-10 text-center",
        className,
      )}
      role="status"
      {...props}
    >
      {Icon ? (
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
          <Icon className="h-7 w-7" strokeWidth={1.75} aria-hidden />
        </span>
      ) : null}
      <h3 className="font-heading text-base font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
      {actionLabel && onAction ? (
        <PrimaryButton className="mt-6" onClick={onAction}>
          {actionLabel}
        </PrimaryButton>
      ) : null}
    </div>
  );
}
