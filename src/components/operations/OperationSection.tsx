import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface OperationSectionProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function OperationSection({
  title,
  description,
  action,
  children,
  className,
}: OperationSectionProps) {
  return (
    <section
      className={cn("space-y-3.5", className)}
      aria-labelledby={`operation-section-${title.replace(/\s+/g, "-")}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            id={`operation-section-${title.replace(/\s+/g, "-")}`}
            className="font-heading text-base font-semibold tracking-tight sm:text-lg"
          >
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0 [&_button]:min-h-10">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
