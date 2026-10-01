import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { generateMatchRecap, MatchRecapRequest, MatchRecapResponse, matchRecapQueryKey } from '../services/ai/matchRecapService';

export function useMatchRecap(request: MatchRecapRequest | null) {
  const queryClient = useQueryClient();
  const inFlight = useRef(false);
  const cachedRecap = useQuery<MatchRecapResponse | null>({
    queryKey: request ? matchRecapQueryKey(request) : ['ai-match-recap', null],
    queryFn: async () => null,
    enabled: false,
    staleTime: Infinity,
  });
  const generation = useMutation({
    mutationFn: generateMatchRecap,
    onSuccess: (response, input) => {
      queryClient.setQueryData(matchRecapQueryKey(input), response);
    },
  });

  const requestKey = request ? JSON.stringify(request) : null;
  const matchesCurrentRequest = Boolean(request && generation.variables && JSON.stringify(generation.variables) === requestKey);
  const isGenerating = matchesCurrentRequest && generation.isPending;
  const generationError = matchesCurrentRequest && generation.isError;

  return {
    recap: cachedRecap.data ?? null,
    isGenerating,
    hasError: generationError && !cachedRecap.data?.summary,
    generate: async (): Promise<void> => {
      if (!request || inFlight.current || generation.isPending) return;
      inFlight.current = true;
      try {
        await generation.mutateAsync(request);
      } catch {
        // Keep Match Detail usable and let the user retry from the recap card.
      } finally {
        inFlight.current = false;
      }
    },
  };
}
