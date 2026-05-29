/**
 * Rendu markdown léger pour articles d'aide (pas de dépendance externe).
 */
export function HelpMarkdownContent({ content }: { content: string }) {
  const paragraphs = content.split('\n\n').filter(Boolean);

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none space-y-3">
      {paragraphs.map((para, i) => {
        const lines = para.split('\n');
        const isList = lines.every((l) => l.match(/^\d+\.\s/) || l.startsWith('- '));

        if (isList) {
          return (
            <ol key={i} className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground">
              {lines.map((line, j) => (
                <li key={j}>{line.replace(/^\d+\.\s/, '').replace(/^-\s/, '')}</li>
              ))}
            </ol>
          );
        }

        return (
          <p key={i} className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {para}
          </p>
        );
      })}
    </div>
  );
}
