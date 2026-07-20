/**
 * Bouton contact support WhatsApp E-Samba.
 */

import { MessageCircle } from "lucide-react";
import { buildWhatsAppUrl, SOCIAL } from "@/config/navigation";

const SUPPORT_HOURS = "Lun–Sam 7h–19h (WAT)";

interface WhatsAppSupportButtonProps {
  compact?: boolean;
  className?: string;
}

export function WhatsAppSupportButton({ compact = false, className = "" }: WhatsAppSupportButtonProps) {
  const url = buildWhatsAppUrl(SOCIAL.whatsappSupportMessage);

  if (compact) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`
          inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white
          hover:bg-emerald-600 active:scale-[0.98] transition-all ${className}
        `}
      >
        <MessageCircle className="h-4 w-4" aria-hidden />
        WhatsApp Support
      </a>
    );
  }

  return (
    <div
      className={`rounded-xl border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800 p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500">
          <MessageCircle className="h-5 w-5 text-white" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Support E-Samba</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Une question ? Notre équipe répond en moins de 2h pendant les heures ouvrables.
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">{SUPPORT_HOURS}</p>
        </div>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="
          mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2.5
          text-sm font-semibold text-white hover:bg-emerald-600 active:scale-[0.98] transition-all
        "
      >
        <MessageCircle className="h-4 w-4" aria-hidden />
        Contacter via WhatsApp
      </a>
    </div>
  );
}
