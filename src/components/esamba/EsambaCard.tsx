import { Card, type CardProps } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Carte alignée design system E-Samba. */
export function EsambaCard({ className, ...props }: CardProps) {
  return <Card className={cn("rounded-xl border-border shadow-sm", className)} {...props} />;
}
