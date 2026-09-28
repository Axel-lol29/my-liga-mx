import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthProvider';
import { getPreferences, updatePreferences as persistPreferences } from '../services/profile/profileService';
import { UserPreferences } from '../types';

type NotificationPreferenceChanges = Partial<Pick<UserPreferences, 'notificationsEnabled' | 'matchStartNotifications' | 'matchReminderMinutes'>>;
const preferencesKey = (userId?: string) => ['user-preferences', userId] as const;

export function useNotificationPreferences() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const queryKey = preferencesKey(userId);
  const query = useQuery({
    queryKey,
    queryFn: () => getPreferences(userId as string),
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
  });

  const mutation = useMutation<void, Error, NotificationPreferenceChanges, { previous: UserPreferences | null | undefined }>( {
    mutationFn: async (changes) => {
      if (!userId) throw new Error('La sesión no está disponible.');
      await persistPreferences(userId, changes);
    },
    onMutate: async (changes) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<UserPreferences | null>(queryKey);
      queryClient.setQueryData<UserPreferences | null>(queryKey, (current) => current ? { ...current, ...changes } : current);
      return { previous };
    },
    onError: (error, _changes, context) => {
      if (context) queryClient.setQueryData(queryKey, context.previous);
      console.warn('No se pudo guardar la preferencia de notificaciones.', error);
    },
    onSettled: async () => {
      if (userId) await queryClient.invalidateQueries({ queryKey, exact: true });
    },
  });

  return {
    ...query,
    preferences: query.data ?? null,
    updateNotificationPreferences: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
}
