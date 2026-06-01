import type { LucideIcon } from "lucide-react";
import { ExternalLink } from "lucide-react";
import { getMarketingUrl } from "@/lib/marketing-url";
import type { MarketingGuidePath } from "@/data/marketing/fonctionnalites";
import { cn } from "@/lib/utils";

interface MarketingCardProps {
  href: MarketingGuidePath;
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
  iconClassName?: string;
}

/** Carte cliquable vers une page du hub marketing (Option A). */
export function MarketingCard({
  href,
  icon: Icon,
  title,
  description,
  className,
  iconClassName,
}: MarketingCardProps) {
  return (
    <a
      href={getMarketingUrl(href)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group block p-6 rounded-2xl bg-card border border-border",
        "hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "animate-fade-in-up",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div
          className={cn(
            "w-12 h-12 rounded-lg flex items-center justify-center",
            iconClassName ?? "bg-primary/10 text-primary",
          )}
        >
          <Icon className="w-6 h-6" aria-hidden />
        </div>
        <ExternalLink
          className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1"
          aria-hidden
        />
      </div>
      <h3 className="text-lg font-heading font-semibold mb-2 group-hover:text-primary transition-colors">
        {title}
      </h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </a>
  );
}
