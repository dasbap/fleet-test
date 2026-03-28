import { useCallback, useState } from "react";
import { Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { shareContent } from "@/services/share.service";
import type { SharePayload } from "@/types/share";
import { cn } from "@/lib/utils";
import type { ButtonProps } from "@/components/ui/button";

export interface ShareButtonProps extends Omit<ButtonProps, "onClick" | "children"> {
  /** Fabrique le contenu au clic (URL courante, données fraîches). */
  getPayload: () => SharePayload | Promise<SharePayload>;
  /** Libellé du bouton. */
  label?: string;
}

/**
 * Bouton de partage système (Capacitor Share / Web Share API) avec repli presse-papiers.
 */
export function ShareButton({
  getPayload,
  label = "Partager",
  className,
  variant = "outline",
  size = "sm",
  disabled,
  ...rest
}: ShareButtonProps) {
  const [pending, setPending] = useState(false);

  const onClick = useCallback(async () => {
    setPending(true);
    try {
      const payload = await Promise.resolve(getPayload());
      const { outcome } = await shareContent(payload);
      if (outcome === "copied") {
        toast({
          title: "Copié",
          description: "Le contenu a été copié dans le presse-papiers.",
        });
      } else if (outcome === "unavailable") {
        toast({
          title: "Partage indisponible",
          description: "Impossible de partager ou de copier sur cet appareil.",
          variant: "destructive",
        });
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Partage impossible.";
      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      });
    } finally {
      setPending(false);
    }
  }, [getPayload]);

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(className)}
      disabled={disabled || pending}
      onClick={onClick}
      aria-busy={pending}
      {...rest}
    >
      {pending ? (
        <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" aria-hidden />
      ) : (
        <Share2 className="mr-2 h-4 w-4 shrink-0" aria-hidden />
      )}
      {label}
    </Button>
  );
}
