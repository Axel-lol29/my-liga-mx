import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthProvider';
import { addFavoriteMatch, FavoriteMatch, getFavoriteMatches, removeFavoriteMatch } from '../services/favorites/favoriteMatchesService';
import { Fixture } from '../types';

const favoriteMatchesKey = (userId?: string) => ['favorite-matches', userId] as const;

export function useFavoriteMatches(enabled = true) {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: favoriteMatchesKey(userId),
    queryFn: () => getFavoriteMatches(userId as string),
    enabled: Boolean(userId) && enabled,
    staleTime: 15 * 60 * 1000,
  });
}

export function useIsFavoriteMatch(eventId?: string) {
  const query = useFavoriteMatches();
  return { ...query, isFavorite: Boolean(eventId && query.data?.some((match) => match.eventId === eventId)) };
}

interface ToggleFavoriteVariables {
  fixture: Fixture;
  shouldSave: boolean;
}

interface ToggleFavoriteContext {
  previous: FavoriteMatch[] | undefined;
  userId: string;
}

export function useToggleFavoriteMatch() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const queryKey = favoriteMatchesKey(userId);

  return useMutation<void, Error, ToggleFavoriteVariables, ToggleFavoriteContext>({
    mutationFn: async ({ fixture, shouldSave }) => {
      if (!userId) throw new Error('Inicia sesión para guardar partidos.');
      const eventId = fixture.idEvent?.trim();
      if (!eventId) throw new Error('Este partido no tiene un idEvent válido.');
      if (shouldSave) await addFavoriteMatch(userId, fixture);
      else await removeFavoriteMatch(userId, eventId);
    },
    onMutate: async ({ fixture, shouldSave }) => {
      if (!userId) throw new Error('Inicia sesión para guardar partidos.');
      const eventId = fixture.idEvent?.trim();
      if (!eventId) throw new Error('Este partido no tiene un idEvent válido.');

      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<FavoriteMatch[]>(queryKey);
      queryClient.setQueryData<FavoriteMatch[]>(queryKey, (current = []) => {
        if (shouldSave) {
          if (current.some((match) => match.eventId === eventId)) return current;
          const [eventDate = '', eventTime = ''] = fixture.date.split('T');
          const now = new Date().toISOString();
          return [{
            id: `pending-${eventId}`,
            userId,
            eventId,
            homeTeamName: fixture.homeTeam.name,
            awayTeamName: fixture.awayTeam.name,
            homeTeamBadge: fixture.homeTeam.logo,
            awayTeamBadge: fixture.awayTeam.logo,
            eventDate: eventDate || null,
            eventTime: eventTime || null,
            status: fixture.statusShort || fixture.status,
            homeScore: fixture.homeGoals,
            awayScore: fixture.awayGoals,
            createdAt: now,
          }, ...current];
        }
        return current.filter((match) => match.eventId !== eventId);
      });
      return { previous, userId };
    },
    onError: (error, _variables, context) => {
      if (context?.previous !== undefined) queryClient.setQueryData(favoriteMatchesKey(context.userId), context.previous);
      console.warn('No se pudo actualizar el partido guardado:', error);
    },
    onSettled: async (_data, _error, _variables, context) => {
      if (context?.userId) await queryClient.invalidateQueries({ queryKey: favoriteMatchesKey(context.userId), exact: true });
    },
  });
}
