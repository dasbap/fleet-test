import * as React from "react";
import { cn } from "@/lib/utils";

export interface MobileSectionTitleProps
  extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  /** `none` sous MobileLayout (padding déjà sur le parent). `padded` pour démos / écrans sans marge latérale. */
  inset?: "none" | "padded";
}

const insetClass: Record<NonNullable<MobileSectionTitleProps["inset"]>, string> = {
  none: "pt-1 pb-2",
  padded: "px-4 pt-4 pb-2",
};

export const MobileSectionTitle: React.FC<MobileSectionTitleProps> = ({
  title,
  description,
  inset = "none",
  className,
  ...props
}) => {
  return (
    <div
      className={cn(insetClass[inset], className)}
      {...props}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {description ? (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
};
