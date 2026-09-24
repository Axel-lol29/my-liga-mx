import { Stack, useLocalSearchParams, router } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Card, MatchCard, Screen, StateView, TeamLogo } from '../../components/ui';
import { useSportsDbFixtures, useStandings, useTeam } from '../../src/hooks/useData';
import { Fixture, Team } from '../../src/types';
import { getSportsDbTeamId, resolveTeam, TeamCatalogEntry } from '../../src/services/sportsDb/config';
import { getTeamByInternalId } from '../../src/constants/ligaMxTeams';
import { getTeamAccent, useTheme } from '../../src/theme/ThemeProvider';

export default function TeamDetailScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const { id: rawId } = useLocalSearchParams<{ id: string | string[] }>();
  const receivedIdentifier = Array.isArray(rawId) ? rawId[0] ?? '' : rawId ?? '';
  const id = Number(receivedIdentifier);
  const resolved = resolveTeam(receivedIdentifier);
  const internalId = Number(resolved?.internalId ?? 0);
  const team = useTeam(internalId);
  const fixtures = useSportsDbFixtures();
  const standings = useStandings();
  const resolvedTeam = team.data ?? (resolved ? teamFromCatalog(resolved) : null);
  const sportsDbTeamId = resolved?.sportsDbId ?? (resolvedTeam ? getSportsDbTeamId(resolvedTeam) : null);
  useEffect(() => { console.log('TEAM RESOLVE:', { receivedIdentifier, resolvedInternalId: resolved?.internalId ?? null, resolvedSportsDbId: resolved?.sportsDbId ?? null, resolvedName: resolved?.canonicalName ?? resolvedTeam?.name ?? null }); }, [receivedIdentifier, resolved, resolvedTeam]);
  const teamFixtures = useMemo(() => {
    if (!sportsDbTeamId) return [];
    const numericSportsDbTeamId = Number(sportsDbTeamId);
    return (fixtures.data ?? []).filter((match) => match.homeTeam.id === numericSportsDbTeamId || match.awayTeam.id === numericSportsDbTeamId);
  }, [fixtures.data, sportsDbTeamId]);
  const recentMatches = useMemo(() => teamFixtures.filter((match) => match.status === 'finished').sort((left, right) => (right.timestamp ?? 0) - (left.timestamp ?? 0)).slice(0, 5), [teamFixtures]);
  const liveMatches = useMemo(() => teamFixtures.filter((match) => match.status === 'live'), [teamFixtures]);
  const upcomingMatches = useMemo(() => teamFixtures.filter((match) => match.status === 'scheduled' && match.timestamp !== null && match.timestamp > Date.now()).sort((left, right) => (left.timestamp ?? Number.MAX_SAFE_INTEGER) - (right.timestamp ?? Number.MAX_SAFE_INTEGER)).slice(0, 5), [teamFixtures]);
  const openMatch = (match: Fixture): void => { const eventId = match.idEvent ?? String(match.id); router.push({ pathname: '/match/[id]', params: { id: eventId } }); };

  if (team.isLoading) return <Screen><StateView kind="loading" /></Screen>;
  if (!resolved || !resolvedTeam) { console.log('TEAM DETAIL unresolved:', { receivedId: receivedIdentifier, receivedName: null, slug: receivedIdentifier }); return <Screen><StateView kind="error" message={team.error instanceof Error ? team.error.message : 'Equipo no encontrado.'} onRetry={() => void team.refetch()} /></Screen>; }
  const catalogBadge = getTeamByInternalId(resolved.internalId)?.badge ?? null;
  const teamAccent = getTeamAccent(resolvedTeam);
  const row = standings.data?.find((item) => item.team.id === internalId || item.team.id === id || getSportsDbTeamId(item.team) === resolved.sportsDbId);
  const fixturesLoading = fixtures.isLoading;

  return <Screen refreshing={team.isRefetching || fixtures.isRefetching} onRefresh={() => { void team.refetch(); void fixtures.refetch(); }}>
    <Stack.Screen options={{ headerShown: true, title: resolvedTeam.name, headerBackTitle: 'Atrás' }} />
    <Card style={[styles.heroCard, { borderColor: `${teamAccent}55`, borderLeftWidth: 3, borderLeftColor: teamAccent }]}><View style={styles.heroIdentity}><TeamLogo team={{ ...resolvedTeam, logo: catalogBadge }} size={112} fallbackOnError /><AppText size={12} color={colors.primary} weight="bold">MY LIGA MX · EQUIPO</AppText><AppText size={27} weight="bold">{resolvedTeam.name}</AppText><AppText color={colors.muted}>Liga MX · {resolvedTeam.city ?? 'México'}</AppText><AppText size={13} color={colors.muted}>{resolvedTeam.venue ?? 'Estadio no disponible'}</AppText></View>{row ? <View style={styles.heroSummary}><View style={styles.positionBlock}><AppText size={12} color={colors.muted}>POSICIÓN</AppText><AppText size={28} weight="bold" color={colors.primary}>#{row.rank}</AppText></View><View style={styles.pointsBlock}><AppText size={12} color={colors.muted}>PUNTOS</AppText><AppText size={28} weight="bold">{row.points}</AppText></View></View> : null}</Card>
    {row ? <><AppText size={12} color={colors.primary} weight="bold" style={styles.sectionLabel}>ESTADÍSTICAS</AppText><Card style={styles.statsCard}><View style={styles.statsGrid}><StatMetric label="PJ" value={row.played} /><StatMetric label="G" value={row.wins} /><StatMetric label="E" value={row.draws} /><StatMetric label="P" value={row.losses} /></View><View style={[styles.statsGrid, styles.secondaryStats, { borderTopColor: colors.border }]}><StatMetric label="GF" value={row.goalsFor} /><StatMetric label="GC" value={row.goalsAgainst} /><StatMetric label="DG" value={row.goalDifference} signed /></View></Card></> : null}
    <AppText size={12} color={colors.primary} weight="bold" style={styles.sectionLabel}>PARTIDOS</AppText>
    {fixturesLoading ? <StateView kind="loading" /> : fixtures.isError ? <StateView kind="error" message={fixtures.error instanceof Error ? fixtures.error.message : 'No pudimos cargar los partidos del equipo.'} onRetry={() => void fixtures.refetch()} /> : <>
      {liveMatches.length ? <><AppText size={18} weight="bold" style={styles.subsectionTitle}>EN VIVO</AppText>{liveMatches.map((match) => <MatchCard key={`live-${match.id}`} fixture={match} onPress={() => openMatch(match)} />)}</> : null}
      <AppText size={18} weight="bold" style={styles.subsectionTitle}>ÚLTIMOS PARTIDOS</AppText>
      {recentMatches.length ? recentMatches.map((match) => <MatchCard key={`recent-${match.id}`} fixture={match} onPress={() => openMatch(match)} />) : <AppText color={colors.muted}>No hay partidos recientes disponibles.</AppText>}
      <AppText size={18} weight="bold" style={styles.subsectionTitle}>PRÓXIMOS PARTIDOS</AppText>
      {upcomingMatches.length ? upcomingMatches.map((match) => <MatchCard key={`upcoming-${match.id}`} fixture={match} onPress={() => openMatch(match)} />) : <AppText color={colors.muted}>No hay próximos partidos disponibles.</AppText>}
    </>}
  </Screen>;
}

function StatMetric({ label, value, signed = false }: { label: string; value: number; signed?: boolean }): React.JSX.Element { const { colors } = useTheme(); const formatted = signed && value > 0 ? `+${value}` : String(value); return <View style={styles.statMetric}><AppText size={22} weight="bold">{formatted}</AppText><AppText size={11} color={colors.muted} weight="bold">{label}</AppText></View>; }
function teamFromCatalog(entry: TeamCatalogEntry): Team { return { id: Number(entry.internalId ?? entry.sportsDbId), name: entry.canonicalName, code: null, logo: null, country: 'México', founded: null, venue: null, city: null }; }
const styles = StyleSheet.create({ heroCard: { padding: 20, borderRadius: 24 }, heroIdentity: { alignItems: 'center', gap: 7 }, heroSummary: { flexDirection: 'row', marginTop: 20, paddingTop: 18, borderTopWidth: 1, borderTopColor: '#FFFFFF18' }, positionBlock: { flex: 1, alignItems: 'center', gap: 3 }, pointsBlock: { flex: 1, alignItems: 'center', gap: 3, borderLeftWidth: 1, borderLeftColor: '#FFFFFF18' }, sectionLabel: { marginTop: 24, marginBottom: 10, letterSpacing: 1.1 }, subsectionTitle: { marginTop: 14, marginBottom: 10 }, statsCard: { padding: 14, borderRadius: 18 }, statsGrid: { flexDirection: 'row', justifyContent: 'space-around' }, secondaryStats: { marginTop: 15, paddingTop: 15, borderTopWidth: 1 }, statMetric: { flex: 1, alignItems: 'center', gap: 3 } });
