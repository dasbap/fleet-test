/**
 * Déclencheur d'aide contextuelle — icône ? ou lien « Besoin d'aide ? »
 */
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHelpContextOptional } from '@/context/useHelpContext';
import { cn } from '@/lib/utils';

interface ContextualHelpTriggerProps {
  slug?: string;
  label?: string;
  variant?: 'icon' | 'link';
  className?: string;
}

export function ContextualHelpTrigger({
  slug,
  label = "Besoin d'aide ?",
  variant = 'link',
  className,
}: ContextualHelpTriggerProps) {
  const help = useHelpContextOptional();

  if (!help) return null;

  const handleClick = () => {
    if (slug) {
      help.openHelp({ slug });
    } else {
      help.openHelp();
    }
  };

  if (variant === 'icon') {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn('h-8 w-8 text-muted-foreground', className)}
        onClick={handleClick}
        aria-label={label}
      >
        <HelpCircle className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'inline-flex items-center gap-1 text-xs text-primary hover:underline',
        className,
      )}
    >
      <HelpCircle className="h-3.5 w-3.5" aria-hidden />
      {label}
    </button>
  );
}
