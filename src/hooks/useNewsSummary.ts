import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { newsSummaryQueryKey, NewsSummaryArticle, requestNewsSummary } from '../services/ai/newsSummaryService';

export function useNewsSummary(article: NewsSummaryArticle) {
  const inFlight = useRef(false);
  const [expanded, setExpanded] = useState(false);
  const query = useQuery({
    queryKey: newsSummaryQueryKey(article),
    queryFn: () => requestNewsSummary(article),
    enabled: false,
    staleTime: Infinity,
    retry: false,
  });

  const load = async (): Promise<void> => {
    if (inFlight.current || query.isFetching) return;
    inFlight.current = true;
    setExpanded(true);
    try {
      await query.refetch();
    } catch {
      // The query error state is rendered inside this article card.
    } finally {
      inFlight.current = false;
    }
  };

  const toggle = (): void => {
    if (query.data?.summary || expanded) {
      setExpanded((current) => !current);
      return;
    }
    void load();
  };

  return { ...query, expanded, setExpanded, load, toggle };
}
