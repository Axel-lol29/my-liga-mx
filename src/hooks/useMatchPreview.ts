import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { generateMatchPreview, MatchPreviewRequest, MatchPreviewResponse, matchPreviewQueryKey } from '../services/ai/matchPreviewService';

export function useMatchPreview(request: MatchPreviewRequest | null) {
  const queryClient = useQueryClient();
  const inFlight = useRef(false);
  const cachedPreview = useQuery<MatchPreviewResponse | null>({
    queryKey: request ? matchPreviewQueryKey(request) : ['ai-match-preview', null],
    queryFn: async () => null,
    enabled: false,
    staleTime: Infinity,
  });
  const generation = useMutation({
    mutationFn: generateMatchPreview,
    onSuccess: (response, input) => {
      queryClient.setQueryData(matchPreviewQueryKey(input), response);
    },
  });

  const requestKey = request ? JSON.stringify(request) : null;
  const matchesCurrentRequest = Boolean(request && generation.variables && JSON.stringify(generation.variables) === requestKey);
  const isGenerating = matchesCurrentRequest && generation.isPending;
  const generationError = matchesCurrentRequest && generation.isError;

  return {
    preview: cachedPreview.data ?? null,
    isGenerating,
    hasError: generationError && !cachedPreview.data?.summary,
    generate: async (): Promise<void> => {
      if (!request || inFlight.current || generation.isPending) return;
      inFlight.current = true;
      try {
        await generation.mutateAsync(request);
      } catch {
        // Keep Match Detail usable and let the user retry from the card.
      } finally {
        inFlight.current = false;
      }
    },
  };
}
