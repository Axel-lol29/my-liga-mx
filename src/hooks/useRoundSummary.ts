import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { requestRoundSummary, RoundSummaryRequest, RoundSummaryResponse } from '../services/ai/roundSummaryService';

const CACHE_STALE_TIME = 15 * 60 * 1000;
const queryKey = (request: RoundSummaryRequest | undefined) => ['ai-round-summary', request] as const;

export function useRoundSummary(request?: RoundSummaryRequest) {
  const queryClient = useQueryClient();
  const generationInFlight = useRef(false);
  const cacheQuery = useQuery({
    queryKey: queryKey(request),
    queryFn: () => requestRoundSummary(request as RoundSummaryRequest, false),
    enabled: Boolean(request),
    staleTime: CACHE_STALE_TIME,
    retry: false,
  });
  const generation = useMutation({
    mutationFn: (input: RoundSummaryRequest) => requestRoundSummary(input, true),
    onSuccess: (response: RoundSummaryResponse, input: RoundSummaryRequest) => {
      queryClient.setQueryData(queryKey(input), response);
    },
  });

  const currentRequestKey = request ? JSON.stringify(request) : null;
  const generationMatchesRequest = Boolean(request && generation.variables && JSON.stringify(generation.variables) === currentRequestKey);

  return {
    ...cacheQuery,
    summary: cacheQuery.data?.summary ?? null,
    highlights: cacheQuery.data?.highlights ?? [],
    isPendingGeneration: generationMatchesRequest && generation.isPending,
    hasGenerationError: generationMatchesRequest && generation.isError,
    generate: async () => {
      if (!request || generation.isPending || generationInFlight.current) return;
      generationInFlight.current = true;
      try {
        await generation.mutateAsync(request);
      } catch {
        // Keep any previously cached summary visible; the mutation state drives the retry UI.
      } finally {
        generationInFlight.current = false;
      }
    },
  };
}
