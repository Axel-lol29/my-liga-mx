import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthProvider';
import { getManualMatchReminderIds, setManualMatchReminder } from '../services/notifications/notificationService';

const manualRemindersKey = (userId?: string) => ['manual-match-reminders', userId] as const;

export function useManualMatchReminders() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const queryKey = manualRemindersKey(userId);
  const query = useQuery({
    queryKey,
    queryFn: () => getManualMatchReminderIds(userId as string),
    enabled: Boolean(userId),
    staleTime: Infinity,
  });

  const mutation = useMutation<void, Error, { eventId: string; enabled: boolean }, { previous: string[] | undefined }>( {
    mutationFn: async ({ eventId, enabled }) => {
      if (!userId) throw new Error('Inicia sesión para configurar recordatorios.');
      await setManualMatchReminder(userId, eventId, enabled);
    },
    onMutate: async ({ eventId, enabled }) => {
      if (!userId) throw new Error('Inicia sesión para configurar recordatorios.');
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<string[]>(queryKey);
      queryClient.setQueryData<string[]>(queryKey, (current = []) => enabled
        ? [...new Set([...current, eventId])]
        : current.filter((id) => id !== eventId));
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context) queryClient.setQueryData(queryKey, context.previous);
      console.warn('No se pudo guardar el recordatorio manual del partido.', error);
    },
  });

  return {
    ...query,
    eventIds: query.data ?? [],
    setReminder: mutation.mutate,
    isUpdating: mutation.isPending,
    updatingEventId: mutation.variables?.eventId,
  };
}
