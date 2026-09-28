import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '../src/context/AuthProvider';
import { getTeamByInternalId } from '../src/constants/ligaMxTeams';
import { useManualMatchReminders } from '../src/hooks/useManualMatchReminders';
import { useSportsDbFixtures } from '../src/hooks/useData';
import { useNotificationPreferences } from '../src/hooks/useNotificationPreferences';
import { cancelAllMatchNotifications, syncMatchNotifications } from '../src/services/notifications/notificationService';

export function MatchNotificationsCoordinator(): null {
  const { session, profile, loading: authLoading } = useAuth();
  const preferenceQuery = useNotificationPreferences();
  const notificationsEnabled = Platform.OS !== 'web'
    && preferenceQuery.preferences?.notificationsEnabled === true
    && preferenceQuery.preferences.matchStartNotifications === true;
  const fixturesQuery = useSportsDbFixtures(Boolean(session && notificationsEnabled));
  const manualRemindersQuery = useManualMatchReminders();
  const favoriteTeam = getTeamByInternalId(profile?.favoriteTeamId);

  useEffect(() => {
    if (authLoading || (session && preferenceQuery.isLoading) || (session && preferenceQuery.isError)) return;

    if (!session || !notificationsEnabled) {
      void cancelAllMatchNotifications().catch((error: unknown) => {
        console.warn('No se pudieron cancelar los recordatorios locales de partidos.', error);
      });
      return;
    }

    if (manualRemindersQuery.isLoading || manualRemindersQuery.isError) return;
    if (fixturesQuery.isLoading || fixturesQuery.isError) return;

    void syncMatchNotifications(
      session.user.id,
      favoriteTeam,
      fixturesQuery.data ?? [],
      manualRemindersQuery.data ?? [],
      preferenceQuery.preferences?.matchReminderMinutes ?? 60,
    ).catch((error: unknown) => {
      console.warn('No se pudieron sincronizar los recordatorios locales de partidos.', error);
    });
  }, [
    authLoading,
    favoriteTeam?.internalId,
    fixturesQuery.data,
    fixturesQuery.isError,
    fixturesQuery.isLoading,
    manualRemindersQuery.data,
    manualRemindersQuery.isError,
    manualRemindersQuery.isLoading,
    notificationsEnabled,
    preferenceQuery.preferences?.matchReminderMinutes,
    preferenceQuery.isError,
    preferenceQuery.isLoading,
    session,
  ]);

  return null;
}
