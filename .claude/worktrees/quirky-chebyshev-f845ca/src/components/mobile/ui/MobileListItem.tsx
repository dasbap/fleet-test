import * as React from "react";
import { cn } from "@/lib/utils";

export interface MobileListItemProps
  extends React.HTMLAttributes<HTMLButtonElement> {
  title: string;
  subtitle?: string;
  meta?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  asChild?: boolean;
}

export const MobileListItem: React.FC<MobileListItemProps> = ({
  title,
  subtitle,
  meta,
  leftIcon,
  rightIcon,
  className,
  asChild = false,
  children,
  ...props
}) => {
  const content = (
    <div
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3",
        className,
      )}
    >
      {leftIcon ? <div className="shrink-0">{leftIcon}</div> : null}
      <div className="flex min-w-0 flex-1 flex-col text-left">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        {subtitle ? (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
        {children}
      </div>
      {meta ? (
        <div className="ml-2 shrink-0 text-xs text-muted-foreground">{meta}</div>
      ) : null}
      {rightIcon ? <div className="ml-1 shrink-0">{rightIcon}</div> : null}
    </div>
  );

  if (asChild) {
    return content as unknown as JSX.Element;
  }

  return (
    <button
      type="button"
      className="flex w-full items-stretch border-b border-border text-left last:border-b-0 active:bg-muted/60"
      {...props}
    >
      {content}
    </button>
  );
};

