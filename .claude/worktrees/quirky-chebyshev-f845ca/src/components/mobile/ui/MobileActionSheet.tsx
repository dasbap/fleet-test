import * as React from "react";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface MobileActionSheetAction {
  id: string;
  label: string;
  onSelect: () => void;
  /** Met en évidence une action destructive (supprimer, annuler mission) */
  variant?: "default" | "destructive";
}

export interface MobileActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Titre optionnel (accessibilité + contexte) */
  title?: string;
  actions: MobileActionSheetAction[];
  /** Bouton fermer en bas (souvent « Annuler ») */
  cancelLabel?: string;
  className?: string;
}

/**
 * Feuille d’actions depuis le bas : pattern iOS/Android, Radix Dialog, safe area bas.
 * Préférer ce composant aux menus contextuels desktop sur petit écran.
 */
export function MobileActionSheet({
  open,
  onOpenChange,
  title,
  actions,
  cancelLabel = "Annuler",
  className,
}: MobileActionSheetProps) {
  const handleCancel = React.useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "rounded-t-2xl border-border/80 p-0 pb-safe shadow-2xl",
          "[&>button]:hidden",
          className,
        )}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {title ? (
          <SheetTitle className="sr-only">{title}</SheetTitle>
        ) : (
          <SheetTitle className="sr-only">Actions</SheetTitle>
        )}
        <div className="flex max-h-[min(70vh,520px)] flex-col">
          <div
            className="flex shrink-0 justify-center pt-3 pb-2"
            aria-hidden
          >
            <span className="h-1 w-10 rounded-full bg-muted-foreground/35" />
          </div>
          {title ? (
            <p className="px-4 pb-2 text-center font-heading text-sm font-semibold text-foreground">
              {title}
            </p>
          ) : null}
          <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2" role="menu">
            {actions.map((action) => (
              <li key={action.id} className="list-none" role="none">
                <button
                  type="button"
                  role="menuitem"
                  className={cn(
                    "flex min-h-12 w-full items-center justify-center rounded-xl px-4 py-3 text-base font-medium touch-manipulation transition-colors",
                    action.variant === "destructive"
                      ? "text-destructive hover:bg-destructive/10 active:bg-destructive/15"
                      : "text-foreground hover:bg-muted/70 active:bg-muted",
                  )}
                  onClick={() => {
                    action.onSelect();
                    onOpenChange(false);
                  }}
                >
                  {action.label}
                </button>
              </li>
            ))}
          </ul>
          {cancelLabel ? (
            <div className="border-t border-border/80 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
              <button
                type="button"
                className="flex min-h-12 w-full items-center justify-center rounded-xl py-3 text-base font-semibold text-muted-foreground touch-manipulation hover:bg-muted/60 active:bg-muted/80"
                onClick={handleCancel}
              >
                {cancelLabel}
              </button>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
