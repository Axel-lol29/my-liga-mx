import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '../src/context/AuthProvider';
import { getTeamByInternalId } from '../src/constants/ligaMxTeams';
import { useFavoriteMatches } from '../src/hooks/useFavoriteMatches';
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
  const favoritesQuery = useFavoriteMatches(Boolean(session && notificationsEnabled));
  const favoriteTeam = getTeamByInternalId(profile?.favoriteTeamId);

  useEffect(() => {
    if (authLoading || (session && preferenceQuery.isLoading) || (session && preferenceQuery.isError)) return;

    if (!session || !notificationsEnabled) {
      void cancelAllMatchNotifications().catch((error: unknown) => {
        console.warn('No se pudieron cancelar los recordatorios locales de partidos.', error);
      });
      return;
    }

    if (fixturesQuery.isLoading || favoritesQuery.isLoading || fixturesQuery.isError || favoritesQuery.isError) return;

    void syncMatchNotifications(
      session.user.id,
      favoriteTeam,
      fixturesQuery.data ?? [],
      favoritesQuery.data ?? [],
    ).catch((error: unknown) => {
      console.warn('No se pudieron sincronizar los recordatorios locales de partidos.', error);
    });
  }, [
    authLoading,
    favoriteTeam?.internalId,
    favoritesQuery.data,
    favoritesQuery.isError,
    favoritesQuery.isLoading,
    fixturesQuery.data,
    fixturesQuery.isError,
    fixturesQuery.isLoading,
    notificationsEnabled,
    preferenceQuery.isError,
    preferenceQuery.isLoading,
    session,
  ]);

  return null;
}
