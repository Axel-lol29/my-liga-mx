import { router } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { AppLogo } from '../../components/AppLogo';
import { AppText, Card, MatchCard, NewsCard, Screen, SectionHeader, StateView, TeamLogo } from '../../components/ui';
import { getTeamByInternalId, toAppTeam } from '../../src/constants/ligaMxTeams';
import { useAuth } from '../../src/context/AuthProvider';
import { useNews, useNextFixture, useStandings, useSportsDbFixtures } from '../../src/hooks/useData';
import { useSavedNews } from '../../src/hooks/useSavedNews';
import { useTheme } from '../../src/theme/ThemeProvider';
import { NewsSaveButton } from '../../components/NewsSaveButton';
import { useTeamBrief } from '../../src/hooks/useTeamBrief';
import { TeamBriefRequest } from '../../src/services/ai/teamBriefService';
import { useLeagueBrief } from '../../src/hooks/useLeagueBrief';
import { LeagueBriefMatch, LeagueBriefRequest } from '../../src/services/ai/leagueBriefService';
import { formatMatchDateTime } from '../../src/utils/matchDateTime';
import { SPORTS_DB_LEAGUE_ID, SPORTS_DB_SEASON } from '../../src/services/sportsDb/config';

export default function HomeScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const savedNews = useSavedNews();
  const favoriteId = profile?.favoriteTeamId ?? 0;
  const favoriteEntry = getTeamByInternalId(favoriteId);
  const favoriteTeam = favoriteEntry ? toAppTeam(favoriteEntry) : null;
  const nextFixtureQuery = useNextFixture(favoriteTeam);
  const fixturesQuery = useSportsDbFixtures();
  const standingsQuery = useStandings();
  const newsQuery = useNews(favoriteTeam?.name ? `${favoriteTeam.name} Liga MX` : undefined);
  // Read only an existing Liga MX news cache entry; this must not trigger another request from Home.
  const leagueNewsQuery = useNews({ mode: 'league' }, false);
  const fixtures = fixturesQuery.data ?? [];
  const upcoming = nextFixtureQuery.data ?? null;
  const latest = useMemo(() => favoriteEntry
    ? fixtures
      .filter((item) => item.status === 'finished'
        && (item.homeTeam.id === Number(favoriteEntry.sportsDbId) || item.awayTeam.id === Number(favoriteEntry.sportsDbId)))
      .sort((left, right) => (right.timestamp ?? 0) - (left.timestamp ?? 0))[0] ?? null
    : null, [favoriteEntry, fixtures]);
  const favoriteStanding = useMemo(
    () => standingsQuery.data?.find((row) => row.team.id === favoriteId) ?? null,
    [favoriteId, standingsQuery.data],
  );
  const teamNews = useMemo(
    () => [...(newsQuery.data ?? [])]
      .filter((article) => article.title.trim())
      .sort((left, right) => (Date.parse(right.publishedAt) || 0) - (Date.parse(left.publishedAt) || 0))
      .slice(0, 3),
    [newsQuery.data],
  );
  const teamBriefRequest = useMemo<TeamBriefRequest | null>(() => favoriteTeam && favoriteEntry ? ({
    teamId: favoriteEntry.sportsDbId,
    teamName: favoriteTeam.name,
    lastMatch: latest && hasBriefTeamNames(latest.homeTeam.name, latest.awayTeam.name) ? {
      homeTeam: latest.homeTeam.name,
      awayTeam: latest.awayTeam.name,
      homeScore: latest.homeGoals,
      awayScore: latest.awayGoals,
      localDateTime: formatMatchDateTime(latest.timestamp, latest.date),
    } : null,
    nextMatch: upcoming && hasBriefTeamNames(upcoming.homeTeam.name, upcoming.awayTeam.name) ? {
      homeTeam: upcoming.homeTeam.name,
      awayTeam: upcoming.awayTeam.name,
      localDateTime: formatMatchDateTime(upcoming.timestamp, upcoming.date),
      venue: upcoming.venue,
    } : null,
    standing: favoriteStanding ? {
      position: favoriteStanding.rank,
      points: favoriteStanding.points,
      played: favoriteStanding.played,
    } : null,
    news: teamNews.map((article) => ({ title: article.title, description: article.description })),
  }) : null, [favoriteEntry, favoriteTeam, favoriteStanding, latest, teamNews, upcoming]);
  const leagueBriefRequest = useMemo<LeagueBriefRequest>(() => {
    const standings = (standingsQuery.data ?? []).slice(0, 5).map((row) => ({
      position: row.rank,
      team: row.team.name,
      points: row.points,
      played: row.played,
    }));
    const validFixtures = fixtures.filter((fixture) => hasBriefTeamNames(fixture.homeTeam.name, fixture.awayTeam.name));
    const recentFixtures = validFixtures
      .filter((fixture) => fixture.status === 'finished' && fixture.homeGoals !== null && fixture.awayGoals !== null)
      .sort((left, right) => fixtureSortTime(right) - fixtureSortTime(left))
      .slice(0, 5);
    const futureFixtures = validFixtures
      .filter((fixture) => fixture.status === 'scheduled' && fixtureSortTime(fixture) > Date.now())
      .sort((left, right) => fixtureSortTime(left) - fixtureSortTime(right))
      .slice(0, 5);
    const liveFixtures = validFixtures.filter((fixture) => fixture.status === 'live');
    const toBriefMatch = (fixture: typeof fixtures[number], withScore: boolean): LeagueBriefMatch => ({
      homeTeam: fixture.homeTeam.name,
      awayTeam: fixture.awayTeam.name,
      ...(withScore ? { homeScore: fixture.homeGoals as number, awayScore: fixture.awayGoals as number } : {}),
      localDateTime: formatMatchDateTime(fixture.timestamp, fixture.date),
      round: fixture.round,
      venue: fixture.venue,
    });
    const cachedLeagueNews = [...(leagueNewsQuery.data ?? [])]
      .filter((article) => article.title.trim())
      .sort((left, right) => (Date.parse(right.publishedAt) || 0) - (Date.parse(left.publishedAt) || 0))
      .slice(0, 5)
      .map((article) => ({
        title: article.title,
        description: article.description,
        localDateTime: formatMatchDateTime(Date.parse(article.publishedAt) || null, article.publishedAt),
      }));
    return {
      leagueId: SPORTS_DB_LEAGUE_ID,
      season: SPORTS_DB_SEASON,
      currentRound: liveFixtures.find((fixture) => fixture.round)?.round ?? recentFixtures.find((fixture) => fixture.round)?.round ?? null,
      nextRound: futureFixtures.find((fixture) => fixture.round)?.round ?? null,
      standings,
      recentResults: recentFixtures.map((fixture) => toBriefMatch(fixture, true)),
      upcomingMatches: futureFixtures.map((fixture) => toBriefMatch(fixture, false)),
      news: cachedLeagueNews,
    };
  }, [fixtures, leagueNewsQuery.data, standingsQuery.data]);
  const hasLeagueBriefData = Boolean(leagueBriefRequest.standings.length || leagueBriefRequest.recentResults.length || leagueBriefRequest.upcomingMatches.length || leagueBriefRequest.news.length);
  const isLeagueBriefLoading = standingsQuery.isLoading || fixturesQuery.isLoading;

  useEffect(() => {
    console.log('LOCAL FAVORITE TEAM', {
      favoriteTeamId: profile?.favoriteTeamId,
      resolvedName: favoriteTeam?.name,
      sportsDbId: favoriteEntry?.sportsDbId,
    });
  }, [favoriteEntry, favoriteTeam?.name, profile?.favoriteTeamId]);

  useEffect(() => {
    if (!__DEV__ || !teamBriefRequest) return;
    console.debug('[team-brief] localDateTime enviado a Gemini', {
      team: teamBriefRequest.teamName,
      lastMatch: teamBriefRequest.lastMatch?.localDateTime ?? null,
      nextMatch: teamBriefRequest.nextMatch?.localDateTime ?? null,
    });
  }, [teamBriefRequest]);

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
          <View style={homeStyles.brand}><AppLogo variant="compact" showWordmark={false} /><AppText size={12} color={colors.primaryLight} weight="bold" style={homeStyles.brandText}>MY LIGA MX</AppText></View>
          <AppText size={30} weight="bold">Hola, {profile?.name?.split(' ')[0] ?? 'aficionado'}</AppText>
        </View>
        <View pointerEvents="none" style={[homeStyles.liveDot, { backgroundColor: colors.primary }]} />
      </View>
      <AppText color={colors.muted}>Tu resumen de fútbol mexicano.</AppText>
      <SectionHeader title="Tu equipo" action="Cambiar" onPress={() => router.push('/(auth)/select-team')} />
      {favoriteTeam ? (
        <Card style={{ backgroundColor: colors.surfaceElevated, borderColor: colors.teamAccentBorder }}>
          <View style={homeStyles.teamHero}>
            <View style={[homeStyles.teamAccent, { backgroundColor: colors.teamAccent }]} />
            <TeamLogo team={favoriteTeam} size={68} />
            <View style={homeStyles.teamCopy}>
              <AppText size={21} weight="bold">{favoriteTeam.name}</AppText>
              <AppText color={colors.muted}>{favoriteTeam.city ?? 'Liga MX'}</AppText>
              <AppText size={11} color={colors.teamAccent} weight="bold">EQUIPO FAVORITO</AppText>
            </View>
          </View>
        </Card>
      ) : <StateView kind="empty" message="Selecciona un equipo favorito para personalizar tu inicio." />}
      {nextFixtureQuery.isLoading ? <><SectionHeader title="Próximo partido" /><StateView kind="loading" /></> : nextFixtureQuery.isError ? <><SectionHeader title="Próximo partido" /><StateView kind="error" message="No pudimos cargar el próximo partido." onRetry={() => void nextFixtureQuery.refetch()} /></> : upcoming ? <><SectionHeader title="Próximo partido" /><MatchCard fixture={upcoming} onPress={() => router.push(`/match/${upcoming.id}`)} /></> : <><SectionHeader title="Próximo partido" /><StateView kind="empty" message="No hay próximo partido disponible." /></>}
      {latest ? <><SectionHeader title="Último resultado" /><MatchCard fixture={latest} onPress={() => router.push(`/match/${latest.id}`)} /></> : null}
      {favoriteTeam && teamBriefRequest ? <TeamBriefCard request={teamBriefRequest} teamName={favoriteTeam.name} /> : null}
      <LeagueBriefCard request={leagueBriefRequest} hasData={hasLeagueBriefData} loading={isLeagueBriefLoading} />
      <SectionHeader title="Tabla rápida" action="Ver tabla" onPress={() => router.push('/(tabs)/standings')} />
      {standingsQuery.isLoading ? <StateView kind="loading" /> : standingsQuery.data?.length ? <Card style={{ backgroundColor: colors.surfaceElevated }}>{standingsQuery.data.slice(0, 4).map((row) => <View key={row.team.id} style={[homeStyles.tableRow, { borderBottomColor: colors.border }]}><AppText style={homeStyles.rank} weight="bold" color={row.team.id === favoriteId ? colors.primary : colors.muted}>{row.rank}</AppText><TeamLogo team={row.team} size={25} /><AppText style={homeStyles.teamName} weight={row.team.id === favoriteId ? 'bold' : 'medium'}>{row.team.name}</AppText><AppText weight="bold" color={row.team.id === favoriteId ? colors.primary : undefined}>{row.points} <AppText size={11} color={colors.muted}>PTS</AppText></AppText></View>)}</Card> : <StateView kind="empty" message="No hay tabla disponible." />}
      {newsQuery.data?.length ? <><SectionHeader title="Noticias para ti" action="Ver todas" onPress={() => router.push('/(tabs)/news')} />{newsQuery.data.slice(0, 3).map((article) => {
        const isSaved = savedNews.isSaved(article.url);
        return <NewsCard
          key={article.id}
          article={article}
          onPress={() => router.push(`/news/${encodeURIComponent(article.id)}`)}
          saveControl={<NewsSaveButton
            isSaved={isSaved}
            pending={savedNews.toggleMutation.isPending && savedNews.toggleMutation.variables?.article.url === article.url}
            disabled={!savedNews.canSave || savedNews.isLoading || savedNews.isError}
            onPress={() => savedNews.toggleMutation.mutate({ article, shouldSave: !isSaved })}
          />}
        />;
      })}</> : null}
    </Screen>
  );
}

function TeamBriefCard({ request, teamName }: { request: TeamBriefRequest; teamName: string }): React.JSX.Element {
  const { colors } = useTheme();
  const brief = useTeamBrief(request);
  const hasSummary = Boolean(brief.brief?.summary);

  return <Card style={briefStyles.card}>
    <AppText size={18} weight="bold">Lo más importante de {teamName}</AppText>
    {hasSummary ? <>
      <AppText>{brief.brief?.summary}</AppText>
      {brief.brief?.highlights.length ? <View style={briefStyles.highlights}>
        <AppText size={13} weight="bold">Puntos clave</AppText>
        {brief.brief.highlights.map((highlight, index) => <View key={`${request.teamId}-${index}`} style={briefStyles.highlightRow}>
          <AppText size={13} color={colors.primaryLight}>•</AppText>
          <AppText size={13} color={colors.muted} style={briefStyles.highlightText}>{highlight}</AppText>
        </View>)}
      </View> : null}
      <AppText size={11} color={colors.muted}>Generado con IA a partir de resultados, tabla y noticias disponibles.</AppText>
      {formatBriefUpdatedAt(brief.brief?.generatedAt) ? <AppText size={11} color={colors.mutedSubtle}>Actualizado {formatBriefUpdatedAt(brief.brief?.generatedAt)}</AppText> : null}
    </> : brief.brief?.pending ? <AppText size={13} color={colors.muted}>El resumen se está generando. Puedes volver a consultarlo en un momento.</AppText> : brief.hasError ? <AppText size={13} color={colors.danger}>No pudimos generar el resumen en este momento.</AppText> : <AppText size={13} color={colors.muted}>Obtén un resumen rápido del momento actual de tu equipo.</AppText>}

    {!hasSummary ? <Pressable
      accessibilityRole="button"
      disabled={brief.isGenerating}
      onPress={() => void brief.generate()}
      style={({ pressed }) => [briefStyles.button, { backgroundColor: colors.primary, opacity: brief.isGenerating ? 0.65 : pressed ? 0.82 : 1 }]}
    >
      {brief.isGenerating ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
      <AppText size={14} weight="bold" color="#FFFFFF">
        {brief.isGenerating ? 'Generando resumen…' : brief.hasError ? 'Reintentar' : brief.brief?.pending ? 'Revisar resumen' : 'Generar resumen'}
      </AppText>
    </Pressable> : null}
  </Card>;
}

function LeagueBriefCard({ request, hasData, loading }: { request: LeagueBriefRequest; hasData: boolean; loading: boolean }): React.JSX.Element {
  const { colors } = useTheme();
  const brief = useLeagueBrief(request);
  const hasSummary = Boolean(brief.brief?.summary);
  return <Card style={briefStyles.card}>
    <AppText size={18} weight="bold">Liga MX en 30 segundos</AppText>
    <AppText size={13} color={colors.muted}>Un vistazo a la tabla, los resultados, lo que viene y las noticias disponibles.</AppText>
    {hasSummary ? <>
      <AppText>{brief.brief?.summary}</AppText>
      {brief.brief?.highlights.length ? <View style={briefStyles.highlights}>
        <AppText size={13} weight="bold">Puntos clave</AppText>
        {brief.brief.highlights.map((highlight, index) => <View key={`league-brief-${index}`} style={briefStyles.highlightRow}>
          <AppText size={13} color={colors.primaryLight}>•</AppText>
          <AppText size={13} color={colors.muted} style={briefStyles.highlightText}>{highlight}</AppText>
        </View>)}
      </View> : null}
      <AppText size={11} color={colors.muted}>Generado con los datos actuales disponibles de Liga MX.</AppText>
      {formatBriefUpdatedAt(brief.brief?.generatedAt) ? <AppText size={11} color={colors.mutedSubtle}>Actualizado {formatBriefUpdatedAt(brief.brief?.generatedAt)}</AppText> : null}
    </> : brief.brief?.pending ? <AppText size={13} color={colors.muted}>El resumen se está generando. Puedes volver a consultarlo en un momento.</AppText> : brief.hasError ? <AppText size={13} color={colors.danger}>No pudimos generar el resumen en este momento.</AppText> : loading ? <AppText size={13} color={colors.muted}>Cargando los datos disponibles…</AppText> : !hasData ? <AppText size={13} color={colors.muted}>No hay datos disponibles para generar el resumen por ahora.</AppText> : <AppText size={13} color={colors.muted}>Consulta manualmente el momento actual de la Liga MX, sin pronósticos.</AppText>}
    {!hasSummary ? <Pressable
      accessibilityRole="button"
      disabled={!hasData || loading || brief.isGenerating}
      onPress={() => void brief.generate()}
      style={({ pressed }) => [briefStyles.button, { backgroundColor: colors.primary, opacity: !hasData || loading || brief.isGenerating ? 0.55 : pressed ? 0.82 : 1 }]}
    >
      {brief.isGenerating ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
      <AppText size={14} weight="bold" color="#FFFFFF">
        {brief.isGenerating ? 'Generando resumen…' : brief.hasError ? 'Reintentar' : brief.brief?.pending ? 'Consultar estado' : 'Generar resumen'}
      </AppText>
    </Pressable> : null}
  </Card>;
}

function hasBriefTeamNames(homeTeam: string, awayTeam: string): boolean {
  return [homeTeam, awayTeam].every((name) => {
    const normalized = name.trim().toLocaleLowerCase('es-MX');
    return normalized.length > 0 && normalized !== 'equipo sin nombre';
  });
}

function fixtureSortTime(fixture: { timestamp: number | null; date: string }): number {
  if (fixture.timestamp !== null && Number.isFinite(fixture.timestamp)) return fixture.timestamp;
  const parsed = Date.parse(fixture.date);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatBriefUpdatedAt(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(date);
}

const homeStyles = StyleSheet.create({ welcome: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, brand: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }, brandText: { letterSpacing: 1 }, liveDot: { width: 10, height: 10, borderRadius: 5 }, teamHero: { flexDirection: 'row', alignItems: 'center', gap: 14 }, teamAccent: { width: 4, height: 62, borderRadius: 4 }, teamCopy: { flex: 1, gap: 3 }, tableRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1 }, rank: { width: 20, textAlign: 'center' }, teamName: { flex: 1, minWidth: 0 } });
const briefStyles = StyleSheet.create({ card: { marginTop: 18, gap: 10 }, highlights: { gap: 6 }, highlightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 }, highlightText: { flex: 1 }, button: { minHeight: 46, borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 } });
