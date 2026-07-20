import * as React from "react";

import { cn } from "@/lib/utils";

export interface SectionTitleProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  /** Aligné à droite : lien « Voir tout », compteur, etc. */
  endSlot?: React.ReactNode;
}

/**
 * Titre de section B2B : hiérarchie claire sans effet « carte marketing ».
 */
export function SectionTitle({
  title,
  description,
  endSlot,
  className,
  ...props
}: SectionTitleProps) {
  return (
    <div
      className={cn("mb-3 flex items-start justify-between gap-3", className)}
      {...props}
    >
      <div className="min-w-0 flex-1">
        <h2 className="font-heading text-base font-semibold leading-snug text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {endSlot ? <div className="shrink-0 pt-0.5">{endSlot}</div> : null}
    </div>
  );
}
