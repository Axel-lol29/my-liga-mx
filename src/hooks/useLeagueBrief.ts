import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { generateLeagueBrief, LeagueBriefRequest, LeagueBriefResponse, leagueBriefQueryKey } from '../services/ai/leagueBriefService';

export function useLeagueBrief(request: LeagueBriefRequest) {
  const queryClient = useQueryClient();
  const inFlight = useRef(false);
  const cachedBrief = useQuery<LeagueBriefResponse | null>({
    queryKey: leagueBriefQueryKey(request),
    queryFn: async () => null,
    enabled: false,
    staleTime: Infinity,
  });
  const generation = useMutation({
    mutationFn: generateLeagueBrief,
    onSuccess: (response, input) => queryClient.setQueryData(leagueBriefQueryKey(input), response),
  });
  const requestKey = JSON.stringify(request);
  const matchesCurrentRequest = Boolean(generation.variables && JSON.stringify(generation.variables) === requestKey);
  const isGenerating = matchesCurrentRequest && generation.isPending;

  return {
    brief: cachedBrief.data ?? null,
    isGenerating,
    hasError: matchesCurrentRequest && generation.isError && !cachedBrief.data?.summary,
    generate: async (): Promise<void> => {
      if (inFlight.current || generation.isPending) return;
      inFlight.current = true;
      try {
        await generation.mutateAsync(request);
      } catch {
        // La tarjeta conserva el estado anterior y permite reintentar manualmente.
      } finally {
        inFlight.current = false;
      }
    },
  };
}
