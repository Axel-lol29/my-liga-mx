import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthProvider';
import { NewsArticle } from '../types';
import { getSavedNews, removeSavedNews, saveNews, SavedNewsArticle } from '../services/news/savedNewsService';

const savedNewsKey = (userId?: string) => ['saved-news', userId] as const;

interface ToggleSavedNewsVariables {
  article: NewsArticle;
  shouldSave: boolean;
}

interface ToggleSavedNewsContext {
  previous: SavedNewsArticle[] | undefined;
  queryKey: ReturnType<typeof savedNewsKey>;
}

export function useSavedNews() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const queryKey = savedNewsKey(userId);
  const query = useQuery({
    queryKey,
    queryFn: getSavedNews,
    enabled: Boolean(userId),
    staleTime: 15 * 60 * 1000,
  });

  const toggleMutation = useMutation<void, Error, ToggleSavedNewsVariables, ToggleSavedNewsContext>({
    mutationFn: async ({ article, shouldSave }) => {
      if (!userId) throw new Error('Inicia sesión para guardar noticias.');
      if (shouldSave) await saveNews(article);
      else await removeSavedNews(article.url);
    },
    onMutate: async ({ article, shouldSave }) => {
      if (!userId) throw new Error('Inicia sesión para guardar noticias.');
      await queryClient.cancelQueries({ queryKey, exact: true });
      const previous = queryClient.getQueryData<SavedNewsArticle[]>(queryKey);
      queryClient.setQueryData<SavedNewsArticle[]>(queryKey, (current = []) => {
        if (shouldSave) {
          if (current.some((saved) => saved.url === article.url)) return current;
          const publishedAt = article.publishedAt && Number.isFinite(Date.parse(article.publishedAt)) ? article.publishedAt : '';
          return [{ ...article, id: article.url, publishedAt, createdAt: new Date().toISOString() }, ...current]
            .sort((left, right) => (Date.parse(right.publishedAt) || 0) - (Date.parse(left.publishedAt) || 0));
        }
        return current.filter((saved) => saved.url !== article.url);
      });
      return { previous, queryKey };
    },
    onError: (error, { article, shouldSave }, context) => {
      if (context) {
        queryClient.setQueryData<SavedNewsArticle[]>(context.queryKey, (current) => {
          if (!current) return context.previous;
          if (shouldSave) return current.filter((saved) => saved.url !== article.url);
          const previousArticle = context.previous?.find((saved) => saved.url === article.url);
          return previousArticle && !current.some((saved) => saved.url === article.url)
            ? [...current, previousArticle].sort((left, right) => (Date.parse(right.publishedAt) || 0) - (Date.parse(left.publishedAt) || 0))
            : current;
        });
      }
      console.warn('No se pudo actualizar Noticias guardadas:', error);
    },
    onSettled: async () => {
      if (userId) await queryClient.invalidateQueries({ queryKey, exact: true });
    },
  });

  return {
    ...query,
    isSaved: (articleUrl: string) => Boolean(query.data?.some((article) => article.url === articleUrl)),
    toggleMutation,
    canSave: Boolean(userId),
  };
}
