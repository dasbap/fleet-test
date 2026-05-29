import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { helpService } from '@/hooks/useHelpArticles';
import { ROUTE_PATHS } from '@/navigation/routePaths';
import type { HelpLocale } from '@/types/help';

/** Associe un code erreur métier à un article d'aide. */
export function useErrorHelp(locale: HelpLocale = 'fr') {
  const navigate = useNavigate();

  const openHelpForError = useCallback(
    async (errorCode: string) => {
      const article = await helpService.getArticleForError(errorCode, locale);
      if (article) {
        navigate(`${ROUTE_PATHS.helpArticle(article.category, article.slug)}`);
      } else {
        navigate(ROUTE_PATHS.help);
      }
    },
    [navigate, locale],
  );

  return { openHelpForError };
}
