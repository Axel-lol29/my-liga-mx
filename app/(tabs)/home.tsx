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
import { formatMatchDateTime } from '../../src/utils/matchDateTime';

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

function hasBriefTeamNames(homeTeam: string, awayTeam: string): boolean {
  return [homeTeam, awayTeam].every((name) => {
    const normalized = name.trim().toLocaleLowerCase('es-MX');
    return normalized.length > 0 && normalized !== 'equipo sin nombre';
  });
}

function formatBriefUpdatedAt(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(date);
}

const homeStyles = StyleSheet.create({ welcome: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, brand: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }, brandText: { letterSpacing: 1 }, liveDot: { width: 10, height: 10, borderRadius: 5 }, teamHero: { flexDirection: 'row', alignItems: 'center', gap: 14 }, teamAccent: { width: 4, height: 62, borderRadius: 4 }, teamCopy: { flex: 1, gap: 3 }, tableRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1 }, rank: { width: 20, textAlign: 'center' }, teamName: { flex: 1, minWidth: 0 } });
const briefStyles = StyleSheet.create({ card: { marginTop: 18, gap: 10 }, highlights: { gap: 6 }, highlightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 }, highlightText: { flex: 1 }, button: { minHeight: 46, borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 } });
