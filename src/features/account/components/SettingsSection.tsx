import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Bloc de section paramètres (titre + carte contenu).
 */
export function SettingsSection({
  title,
  description,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <section className={cn("space-y-2", className)}>
      <div className="px-0.5">
        <h2 className="font-heading text-sm font-semibold tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
        )}
      </div>
      <Card>
        <CardContent className="divide-y divide-border p-0">{children}</CardContent>
      </Card>
    </section>
  );
}

interface SettingsRowProps {
  children: ReactNode;
  className?: string;
}

/** Ligne dans une section (padding + flex). */
export function SettingsRow({ children, className }: SettingsRowProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4",
        className
      )}
    >
      {children}
    </div>
  );
}
