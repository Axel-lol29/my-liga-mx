import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { AppText, MatchCard, Screen, SectionHeader, StateView } from '../../components/ui';
import { MatchFavoriteButton } from '../../components/MatchFavoriteButton';
import { useAuth } from '../../src/context/AuthProvider';
import { useFavoriteMatches, useToggleFavoriteMatch } from '../../src/hooks/useFavoriteMatches';
import { useSportsDbFixtures } from '../../src/hooks/useData';
import { FavoriteMatch } from '../../src/services/favorites/favoriteMatchesService';
import { parseSavedMatchDateTime, formatMatchTime } from '../../src/utils/matchDateTime';
import { Fixture, MatchStatus, Team } from '../../src/types';
import { useTheme } from '../../src/theme/ThemeProvider';

export default function FavoriteMatchesScreen(): React.JSX.Element {
  const { session } = useAuth();
  const { colors } = useTheme();
  const favorites = useFavoriteMatches();
  const toggleFavorite = useToggleFavoriteMatch();
  const cachedFixtures = useSportsDbFixtures(false);
  const groups = useMemo(() => groupMatches(favorites.data ?? []), [favorites.data]);

  if (!session) return <Screen><BackButton /><AppText size={30} weight="bold">MIS PARTIDOS</AppText><StateView kind="error" message="Inicia sesión para consultar tus partidos guardados." /></Screen>;
  if (favorites.isLoading) return <Screen><BackButton /><AppText size={30} weight="bold">MIS PARTIDOS</AppText><StateView kind="loading" /></Screen>;
  if (favorites.isError) return <Screen><BackButton /><AppText size={30} weight="bold">MIS PARTIDOS</AppText><AppText color={colors.muted}>Tus partidos guardados.</AppText><StateView kind="error" message="No pudimos cargar tus partidos guardados." onRetry={() => void favorites.refetch()} /></Screen>;

  const renderGroup = (title: string, matches: FavoriteMatch[]): React.ReactNode => matches.length ? <React.Fragment key={title}>
    <SectionHeader title={title} />
    {matches.map((favorite) => {
      const freshFixture = cachedFixtures.data?.find((item) => item.idEvent === favorite.eventId);
      const fixture = freshFixture ?? favoriteToFixture(favorite);
      return <MatchCard
        key={favorite.eventId}
        fixture={fixture}
        dateTimeLabel={formatMatchDate(favorite, freshFixture)}
        onPress={() => router.push({ pathname: '/match/[id]', params: { id: favorite.eventId } })}
        favoriteControl={<MatchFavoriteButton compact isFavorite pending={toggleFavorite.isPending && toggleFavorite.variables?.fixture.idEvent === favorite.eventId} onPress={() => toggleFavorite.mutate({ fixture, shouldSave: false })} />}
      />;
    })}
  </React.Fragment> : null;

  return <Screen>
    <BackButton />
    <AppText size={30} weight="bold">MIS PARTIDOS</AppText>
    <AppText color={colors.muted}>Tus partidos guardados.</AppText>
    {favorites.data?.length
      ? <>
        {renderGroup('EN VIVO', groups.live)}
        {renderGroup('PRÓXIMOS', groups.upcoming)}
        {renderGroup('FINALIZADOS', groups.finished)}
      </>
      : <View style={{ minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <AppText size={34} color={colors.mutedSubtle}>☆</AppText>
        <AppText color={colors.muted}>Aún no tienes partidos guardados.</AppText>
        <AppText color={colors.muted} style={{ textAlign: 'center' }}>Guarda un partido para encontrarlo aquí.</AppText>
      </View>}
  </Screen>;
}

function BackButton(): React.JSX.Element {
  const { colors } = useTheme();
  return <Pressable
    accessibilityRole="button"
    accessibilityLabel="Volver"
    hitSlop={6}
    onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/profile')}
    style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 7, paddingRight: 12, marginBottom: 8 }}
  >
    <AppText size={20} color={colors.primaryLight} weight="bold">‹</AppText>
    <AppText size={14} color={colors.primaryLight} weight="bold">Volver</AppText>
  </Pressable>;
}

function groupMatches(matches: FavoriteMatch[]): { live: FavoriteMatch[]; upcoming: FavoriteMatch[]; finished: FavoriteMatch[] } {
  const live: FavoriteMatch[] = [];
  const upcoming: FavoriteMatch[] = [];
  const finished: FavoriteMatch[] = [];
  for (const match of matches) {
    const status = match.status.trim().toUpperCase();
    if (['FT', 'AET', 'PEN', 'FINISHED', 'MATCH FINISHED'].includes(status)) finished.push(match);
    else if (['1H', 'HT', '2H', '3H', 'ET', 'LIVE', 'IN PLAY', 'IN PROGRESS'].includes(status)) live.push(match);
    else upcoming.push(match);
  }
  const dateValue = (match: FavoriteMatch): number => parseSavedMatchDateTime(match.eventDate, match.eventTime) ?? 0;
  upcoming.sort((left, right) => dateValue(left) - dateValue(right));
  live.sort((left, right) => dateValue(left) - dateValue(right));
  finished.sort((left, right) => dateValue(right) - dateValue(left));
  return { live, upcoming, finished };
}

function favoriteToFixture(favorite: FavoriteMatch): Fixture {
  const homeTeam: Team = { id: 0, name: favorite.homeTeamName, code: null, logo: favorite.homeTeamBadge, country: 'México', founded: null, venue: null, city: null };
  const awayTeam: Team = { id: 0, name: favorite.awayTeamName, code: null, logo: favorite.awayTeamBadge, country: 'México', founded: null, venue: null, city: null };
  const statusShort = favorite.status.trim().toUpperCase();
  const status: MatchStatus = ['FT', 'AET', 'PEN', 'FINISHED', 'MATCH FINISHED'].includes(statusShort)
    ? 'finished'
    : ['1H', 'HT', '2H', '3H', 'ET', 'LIVE', 'IN PLAY', 'IN PROGRESS'].includes(statusShort)
      ? 'live'
      : ['PST', 'POSTPONED'].includes(statusShort)
        ? 'postponed'
        : ['CANC', 'CANCELLED', 'CANCELED'].includes(statusShort)
          ? 'cancelled'
          : 'scheduled';
  const date = favorite.eventDate ? `${favorite.eventDate}${favorite.eventTime ? `T${favorite.eventTime}` : ''}` : '';
  return {
    id: Number(favorite.eventId) || 0,
    idEvent: favorite.eventId,
    date,
    timestamp: parseSavedMatchDateTime(favorite.eventDate, favorite.eventTime),
    status,
    statusShort,
    elapsed: null,
    venue: null,
    homeTeam,
    awayTeam,
    homeGoals: favorite.homeScore,
    awayGoals: favorite.awayScore,
    round: null,
  };
}

function formatMatchDate(favorite: FavoriteMatch, freshFixture?: Fixture): string {
  if (!favorite.eventDate) return 'Fecha no disponible';
  const timestamp = freshFixture?.timestamp ?? parseSavedMatchDateTime(favorite.eventDate, favorite.eventTime);
  if (timestamp === null) return favorite.eventDate;
  const date = new Date(timestamp).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  const time = freshFixture ? formatMatchTime(timestamp, freshFixture.date) : favorite.eventTime ? formatMatchTime(timestamp) : null;
  return time ? `${date} · ${time}` : date;
}
