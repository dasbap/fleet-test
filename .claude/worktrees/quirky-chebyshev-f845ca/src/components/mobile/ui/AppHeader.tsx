import * as React from "react";

import { cn } from "@/lib/utils";

export interface AppHeaderProps extends React.HTMLAttributes<HTMLElement> {
  /** Titre principal (Flotte E-Samba, nom d’écran) */
  title: string;
  /** Sous-titre optionnel (contexte, flotte) */
  subtitle?: string;
  /** Zone gauche : retour, menu, logo */
  leftSlot?: React.ReactNode;
  /** Zone droite : actions (icônes, boutons compacts) */
  rightSlot?: React.ReactNode;
}

/**
 * En-tête fixe type application native : lisible, zones tactiles confortables, safe area haut.
 */
export function AppHeader({
  title,
  subtitle,
  leftSlot,
  rightSlot,
  className,
  ...props
}: AppHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/90",
        "pt-safe",
        className,
      )}
      {...props}
    >
      <div className="flex min-h-[3rem] items-center gap-3 px-4 pb-3 pt-1">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {leftSlot ? (
            <div className="flex shrink-0 items-center [&_button]:min-h-11 [&_button]:min-w-11 [&_a]:min-h-11 [&_a]:min-w-11">
              {leftSlot}
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-heading text-lg font-semibold leading-tight tracking-tight text-foreground">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {rightSlot ? (
          <div className="flex shrink-0 items-center gap-1 [&_button]:min-h-11 [&_button]:min-w-11 [&_a]:min-h-11 [&_a]:min-w-11">
            {rightSlot}
          </div>
        ) : null}
      </div>
    </header>
  );
}
