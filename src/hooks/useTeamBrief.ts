import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { generateTeamBrief, TeamBriefRequest, TeamBriefResponse, teamBriefQueryKey } from '../services/ai/teamBriefService';

export function useTeamBrief(request: TeamBriefRequest | null) {
  const queryClient = useQueryClient();
  const inFlight = useRef(false);
  const cachedBrief = useQuery<TeamBriefResponse | null>({
    queryKey: request ? teamBriefQueryKey(request) : ['ai-team-brief', null],
    queryFn: async () => null,
    enabled: false,
    staleTime: Infinity,
  });
  const generation = useMutation({
    mutationFn: generateTeamBrief,
    onSuccess: (response, input) => {
      queryClient.setQueryData(teamBriefQueryKey(input), response);
    },
  });

  const requestKey = request ? JSON.stringify(request) : null;
  const matchesCurrentRequest = Boolean(request && generation.variables && JSON.stringify(generation.variables) === requestKey);
  const isGenerating = matchesCurrentRequest && generation.isPending;
  const generationError = matchesCurrentRequest && generation.isError;

  return {
    brief: cachedBrief.data ?? null,
    isGenerating,
    hasError: generationError && !cachedBrief.data?.summary,
    generate: async (): Promise<void> => {
      if (!request || inFlight.current || generation.isPending) return;
      inFlight.current = true;
      try {
        await generation.mutateAsync(request);
      } catch {
        // Keep any summary already held in the query cache visible after a failed retry.
      } finally {
        inFlight.current = false;
      }
    },
  };
}
