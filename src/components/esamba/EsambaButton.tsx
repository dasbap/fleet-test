import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Bouton aligné design system E-Samba (délègue shadcn). */
export function EsambaButton({ className, ...props }: ButtonProps) {
  return <Button className={cn("touch-manipulation", className)} {...props} />;
}
