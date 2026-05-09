import * as React from "react";

import { cn } from "@/lib/utils";

export type ScreenContainerBottomInset = "none" | "safe" | "tabBar";

export interface ScreenContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Réserve l’espace en bas (onglets, zones sûres iOS/Android). */
  bottomInset?: ScreenContainerBottomInset;
  as?: "div" | "main";
}

const bottomInsetClass: Record<ScreenContainerBottomInset, string> = {
  none: "",
  safe: "pb-safe",
  /** Espace type barre d’onglets + safe area (Capacitor) */
  tabBar: "pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]",
};

/**
 * Conteneur d’écran mobile : colonne pleine hauteur, défilement, marges latérales cohérentes.
 */
export function ScreenContainer({
  children,
  className,
  bottomInset = "none",
  as: Component = "main",
  ...props
}: ScreenContainerProps) {
  return (
    <Component
      className={cn(
        "flex min-h-[100dvh] flex-1 flex-col bg-background",
        "px-4",
        bottomInsetClass[bottomInset],
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
