import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Card, MatchCard, NewsCard, Screen, SectionHeader, StateView, TeamLogo } from '../../components/ui';
import { getTeamByInternalId, toAppTeam } from '../../src/constants/ligaMxTeams';
import { useAuth } from '../../src/context/AuthProvider';
import { useFixtures, useNews, useNextFixture, useStandings } from '../../src/hooks/useData';
import { useTheme } from '../../src/theme/ThemeProvider';

export default function HomeScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const favoriteId = profile?.favoriteTeamId ?? 0;
  const favoriteEntry = getTeamByInternalId(favoriteId);
  const favoriteTeam = favoriteEntry ? toAppTeam(favoriteEntry) : null;
  const nextFixtureQuery = useNextFixture(favoriteTeam);
  const fixturesQuery = useFixtures({ teamId: favoriteId });
  const standingsQuery = useStandings();
  const newsQuery = useNews(favoriteTeam?.name ? `${favoriteTeam.name} Liga MX` : undefined);
  const fixtures = fixturesQuery.data ?? [];
  const upcoming = nextFixtureQuery.data ?? null;
  const latest = [...fixtures].reverse().find((item) => item.status === 'finished');

  useEffect(() => {
    console.log('LOCAL FAVORITE TEAM', {
      favoriteTeamId: profile?.favoriteTeamId,
      resolvedName: favoriteTeam?.name,
      sportsDbId: favoriteEntry?.sportsDbId,
    });
  }, [favoriteEntry, favoriteTeam?.name, profile?.favoriteTeamId]);

  return (
    <Screen
      refreshing={nextFixtureQuery.isRefetching || fixturesQuery.isRefetching}
      onRefresh={() => {
        void nextFixtureQuery.refetch();
        void fixturesQuery.refetch();
        void standingsQuery.refetch();
        void newsQuery.refetch();
      }}
    >
      <View style={homeStyles.welcome}>
        <View>
          <AppText size={12} color={colors.primary} weight="bold">MY LIGA MX</AppText>
          <AppText size={30} weight="bold">Hola, {profile?.name?.split(' ')[0] ?? 'aficionado'}</AppText>
        </View>
        <View style={[homeStyles.liveDot, { backgroundColor: colors.primary }]} />
      </View>
      <AppText color={colors.muted}>Tu resumen de fútbol mexicano.</AppText>
      <SectionHeader title="Tu equipo" action="Cambiar" onPress={() => router.push('/(auth)/select-team')} />
      {favoriteTeam ? (
        <Card style={{ backgroundColor: colors.surfaceElevated, borderColor: colors.primary + '55' }}>
          <View style={homeStyles.teamHero}>
            <View style={[homeStyles.teamAccent, { backgroundColor: colors.primary }]} />
            <TeamLogo team={favoriteTeam} size={68} />
            <View style={homeStyles.teamCopy}>
              <AppText size={21} weight="bold">{favoriteTeam.name}</AppText>
              <AppText color={colors.muted}>{favoriteTeam.city ?? 'Liga MX'}</AppText>
              <AppText size={11} color={colors.primary} weight="bold">EQUIPO FAVORITO</AppText>
            </View>
          </View>
        </Card>
      ) : <StateView kind="empty" message="Selecciona un equipo favorito para personalizar tu inicio." />}
      {nextFixtureQuery.isLoading ? <><SectionHeader title="Próximo partido" /><StateView kind="loading" /></> : nextFixtureQuery.isError ? <><SectionHeader title="Próximo partido" /><StateView kind="error" message="No pudimos cargar el próximo partido." onRetry={() => void nextFixtureQuery.refetch()} /></> : upcoming ? <><SectionHeader title="Próximo partido" /><MatchCard fixture={upcoming} onPress={() => router.push(`/match/${upcoming.id}`)} /></> : <><SectionHeader title="Próximo partido" /><StateView kind="empty" message="No hay próximo partido disponible." /></>}
      {latest ? <><SectionHeader title="Último resultado" /><MatchCard fixture={latest} onPress={() => router.push(`/match/${latest.id}`)} /></> : null}
      <SectionHeader title="Tabla rápida" action="Ver tabla" onPress={() => router.push('/(tabs)/standings')} />
      {standingsQuery.isLoading ? <StateView kind="loading" /> : standingsQuery.data?.length ? <Card style={{ backgroundColor: colors.surfaceElevated }}>{standingsQuery.data.slice(0, 4).map((row) => <View key={row.team.id} style={[homeStyles.tableRow, { borderBottomColor: colors.border }]}><AppText style={homeStyles.rank} weight="bold" color={row.team.id === favoriteId ? colors.primary : colors.muted}>{row.rank}</AppText><TeamLogo team={row.team} size={25} /><AppText style={homeStyles.teamName} weight={row.team.id === favoriteId ? 'bold' : 'medium'}>{row.team.name}</AppText><AppText weight="bold" color={row.team.id === favoriteId ? colors.primary : undefined}>{row.points} <AppText size={11} color={colors.muted}>PTS</AppText></AppText></View>)}</Card> : <StateView kind="empty" message="No hay tabla disponible." />}
      {newsQuery.data?.length ? <><SectionHeader title="Noticias para ti" action="Ver todas" onPress={() => router.push('/(tabs)/news')} />{newsQuery.data.slice(0, 3).map((article) => <NewsCard key={article.id} article={article} onPress={() => router.push(`/news/${encodeURIComponent(article.id)}`)} />)}</> : null}
    </Screen>
  );
}

const homeStyles = StyleSheet.create({ welcome: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, liveDot: { width: 10, height: 10, borderRadius: 5 }, teamHero: { flexDirection: 'row', alignItems: 'center', gap: 14 }, teamAccent: { width: 4, height: 62, borderRadius: 4 }, teamCopy: { flex: 1, gap: 3 }, tableRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1 }, rank: { width: 20, textAlign: 'center' }, teamName: { flex: 1, minWidth: 0 } });
