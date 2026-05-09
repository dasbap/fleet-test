import * as React from "react";
import { cn } from "@/lib/utils";

type HeadingElement = "h1" | "h2" | "h3";

export interface MobileHeaderProps extends React.HTMLAttributes<HTMLElement> {
  title: string;
  subtitle?: string;
  as?: HeadingElement;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  subtitle,
  as = "h1",
  leftAction,
  rightAction,
  className,
  ...props
}) => {
  const HeadingTag = as;

  return (
    <header
      className={cn(
        "flex h-14 items-center justify-between border-b border-border bg-background px-4",
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-3">
        {leftAction ? <div className="shrink-0">{leftAction}</div> : null}
        <div className="flex flex-col">
          <HeadingTag className="text-base font-semibold text-foreground">
            {title}
          </HeadingTag>
          {subtitle ? (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {rightAction ? <div className="shrink-0">{rightAction}</div> : null}
    </header>
  );
};

