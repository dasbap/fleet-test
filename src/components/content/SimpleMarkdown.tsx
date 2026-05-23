import { cn } from '@/lib/utils';

interface SimpleMarkdownProps {
  source: string;
  className?: string;
}

/**
 * Rendu markdown minimal (titres, listes, paragraphes) sans dépendance externe.
 */
export function SimpleMarkdown({ source, className }: SimpleMarkdownProps) {
  const blocks = source.trim().split(/\n\n+/);

  return (
    <div className={cn('space-y-4 text-muted-foreground leading-relaxed', className)}>
      {blocks.map((block, index) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        if (trimmed.startsWith('## ')) {
          return (
            <h2
              key={index}
              className="font-heading text-xl font-semibold text-foreground mt-8 first:mt-0"
            >
              {trimmed.slice(3)}
            </h2>
          );
        }

        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={index} className="font-heading text-lg font-semibold text-foreground">
              {trimmed.slice(4)}
            </h3>
          );
        }

        if (trimmed.split('\n').every((line) => line.startsWith('- '))) {
          return (
            <ul key={index} className="list-disc pl-5 space-y-1">
              {trimmed.split('\n').map((line) => (
                <li key={line}>{line.slice(2)}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={index} className="text-sm md:text-base">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}
