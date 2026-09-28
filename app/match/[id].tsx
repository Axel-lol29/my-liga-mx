import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { MatchFavoriteButton } from '../../components/MatchFavoriteButton';
import { MatchReminderButton } from '../../components/MatchReminderButton';
import { AppText, Card, Screen, StateView, TeamLogo } from '../../components/ui';
import { useSportsDbEventDetail, useSportsDbEventLineup, useSportsDbEventStatistics, useSportsDbEventTimeline } from '../../src/hooks/useData';
import { useFavoriteMatches, useToggleFavoriteMatch } from '../../src/hooks/useFavoriteMatches';
import { useManualMatchReminders } from '../../src/hooks/useManualMatchReminders';
import { canSetMatchReminder } from '../../src/services/notifications/notificationService';
import { getMatchStatusLabel } from '../../src/services/sportsDb/presentation';
import { Fixture, FixtureEvent, MatchLineupPlayer, MatchStatistic, Team } from '../../src/types';
import { useTheme } from '../../src/theme/ThemeProvider';
import { formatMatchDateTime } from '../../src/utils/matchDateTime';

const eventIcon: Record<FixtureEvent['type'], string> = { goal: '⚽', yellow_card: '🟨', red_card: '🟥', substitution: '🔄', var: '▣', unknown: '•' };
const eventLabel: Record<FixtureEvent['type'], string> = { goal: 'GOL', yellow_card: 'TARJETA AMARILLA', red_card: 'TARJETA ROJA', substitution: 'CAMBIO', var: 'VAR', unknown: 'EVENTO' };

export default function MatchDetailScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const eventId = Array.isArray(params.id) ? params.id[0] ?? '' : params.id ?? '';
  console.log('MATCH DETAIL PARAM:', eventId);
  const detail = useSportsDbEventDetail(eventId);
  const favoriteMatches = useFavoriteMatches();
  const toggleFavorite = useToggleFavoriteMatch();
  const reminders = useManualMatchReminders();
  const optionalDataEnabled = Boolean(detail.data && detail.data.status !== 'scheduled');
  const timeline = useSportsDbEventTimeline(eventId, optionalDataEnabled);
  const statistics = useSportsDbEventStatistics(eventId, optionalDataEnabled);
  const lineup = useSportsDbEventLineup(eventId, optionalDataEnabled);

  if (detail.isLoading) return <Screen><StateView kind="loading" /></Screen>;
  if (detail.isError || !detail.data) return <Screen><StateView kind="error" message={detail.error instanceof Error ? detail.error.message : 'Partido no encontrado.'} onRetry={() => void detail.refetch()} /></Screen>;

  const match = detail.data;
  const isFavorite = Boolean(match.idEvent && favoriteMatches.data?.some((favorite) => favorite.eventId === match.idEvent));
  const hasReminder = Boolean(match.idEvent && reminders.eventIds.includes(match.idEvent));
  const dateLabel = formatMatchDateTime(match.timestamp, match.date) ?? 'Fecha no disponible';
  const statusLabel = getMatchStatusLabel(match);
  const homeLineup = lineup.data?.filter((player) => belongsToTeam(player, match.homeTeam, true)) ?? [];
  const awayLineup = lineup.data?.filter((player) => belongsToTeam(player, match.awayTeam, false)) ?? [];
  const unassignedLineup = lineup.data?.filter((player) => !belongsToTeam(player, match.homeTeam, true) && !belongsToTeam(player, match.awayTeam, false)) ?? [];
  const timelineIsPartial = timeline.data ? looksLikePartialTimeline(timeline.data, match.homeGoals, match.awayGoals, match.status) : false;
  const hasTeamSeparatedLineup = homeLineup.length > 0 || awayLineup.length > 0;
  const lineupIsPartial = Boolean(lineup.data?.length && (hasTeamSeparatedLineup ? homeLineup.length < 11 || awayLineup.length < 11 : unassignedLineup.length < 22));

  return <Screen refreshing={detail.isRefetching} onRefresh={() => { void detail.refetch(); void timeline.refetch(); void statistics.refetch(); void lineup.refetch(); }}>
    <Stack.Screen options={{ headerShown: true, title: 'Detalle de partido', headerBackTitle: 'Atrás' }} />
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <AppText size={13} color={colors.muted} style={{ flex: 1 }}>{match.round ?? 'Liga MX'} · {match.venue ?? 'Estadio no disponible'}</AppText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {match.idEvent && canSetMatchReminder(match) ? <MatchReminderButton
          isEnabled={hasReminder}
          pending={reminders.isUpdating && reminders.updatingEventId === match.idEvent}
          disabled={reminders.isLoading || reminders.isError}
          onPress={() => {
            if (!canSetMatchReminder(match)) return;
            reminders.setReminder({ eventId: match.idEvent as string, enabled: !hasReminder });
          }}
        /> : null}
        {match.idEvent ? <MatchFavoriteButton isFavorite={isFavorite} pending={toggleFavorite.isPending} disabled={favoriteMatches.isLoading || favoriteMatches.isError} onPress={() => toggleFavorite.mutate({ fixture: match, shouldSave: !isFavorite })} /> : null}
      </View>
    </View>
    <AppText size={12} color={match.status === 'live' ? colors.danger : colors.muted} weight="bold" style={{ marginTop: 5 }}>{statusLabel} · {dateLabel}</AppText>
    <Card style={{ marginTop: 14 }}><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><View style={{ alignItems: 'center', flex: 1, gap: 8 }}><TeamLogo team={match.homeTeam} size={64} /><AppText weight="bold" style={{ textAlign: 'center' }}>{match.homeTeam.name}</AppText></View><View style={{ alignItems: 'center' }}><AppText size={30} weight="bold">{match.homeGoals ?? '-'} - {match.awayGoals ?? '-'}</AppText><AppText size={11} color={match.status === 'live' ? colors.danger : colors.muted}>{statusLabel}</AppText></View><View style={{ alignItems: 'center', flex: 1, gap: 8 }}><TeamLogo team={match.awayTeam} size={64} /><AppText weight="bold" style={{ textAlign: 'center' }}>{match.awayTeam.name}</AppText></View></View></Card>
    {optionalDataEnabled && timeline.isLoading ? <><AppText size={21} weight="bold">Eventos</AppText><StateView kind="loading" /></> : null}
    {optionalDataEnabled && timeline.data?.length ? <><AppText size={21} weight="bold">Eventos</AppText>{timelineIsPartial ? <AppText size={12} color={colors.muted} style={{ marginTop: 2, marginBottom: 8 }}>Mostrando eventos disponibles</AppText> : null}<Card>{timeline.data.map((event, index) => <EventRow key={eventKey(event, index)} event={event} last={index === timeline.data.length - 1} />)}</Card></> : optionalDataEnabled && !timeline.isLoading ? <><AppText size={21} weight="bold">Eventos</AppText><AppText size={13} color={colors.muted}>Eventos detallados no disponibles.</AppText></> : null}
    {optionalDataEnabled && statistics.isLoading ? <><AppText size={21} weight="bold">Estadísticas</AppText><StateView kind="loading" /></> : null}
    {optionalDataEnabled && !statistics.isLoading ? <><AppText size={21} weight="bold">Estadísticas</AppText>{statistics.data?.length ? <Card>{statistics.data.map((stat) => <StatisticRow key={stat.label} stat={stat} />)}</Card> : <AppText size={13} color={colors.muted}>Estadísticas no disponibles.</AppText>}</> : null}
    {optionalDataEnabled && lineup.isLoading ? <><AppText size={21} weight="bold">Alineaciones</AppText><StateView kind="loading" /></> : null}
    {optionalDataEnabled && !lineup.isLoading ? <><AppText size={21} weight="bold">Alineaciones</AppText>{lineup.data?.length ? <>{lineupIsPartial ? <AppText size={12} color={colors.muted} style={{ marginTop: 2, marginBottom: 8 }}>La fuente gratuita no proporciona la alineación completa para este partido.</AppText> : null}{homeLineup.length ? <LineupTeam team={match.homeTeam} players={homeLineup} partial={lineupIsPartial} /> : null}{awayLineup.length ? <LineupTeam team={match.awayTeam} players={awayLineup} partial={lineupIsPartial} /> : null}{unassignedLineup.length ? <LineupGroup title={lineupIsPartial ? 'Jugadores disponibles' : 'Plantilla del partido'} players={unassignedLineup} /> : null}</> : <AppText size={13} color={colors.muted}>Alineaciones no disponibles.</AppText>}</> : null}
  </Screen>;
}

function eventKey(event: FixtureEvent, index: number): string { const stableId = event.id?.trim(); return stableId || `${event.type}-${event.time ?? 'sin-minuto'}-${event.player ?? 'sin-jugador'}-${event.teamId ?? event.team ?? 'sin-equipo'}-${index}`; }
function looksLikePartialTimeline(events: FixtureEvent[], homeGoals: number | null, awayGoals: number | null, status: Fixture['status']): boolean { if (!events.length || events.length > 5 || status === 'scheduled') return false; const scoreGoals = (homeGoals ?? 0) + (awayGoals ?? 0); const timelineGoals = events.filter((event) => event.type === 'goal').length; return events.length === 5 || scoreGoals > timelineGoals; }
function belongsToTeam(player: MatchLineupPlayer, team: Team, home: boolean): boolean { return player.teamId === team.id || Boolean(player.team && normalizeName(player.team) === normalizeName(team.name)) || player.home === home; }
function normalizeName(value: string): string { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
function EventRow({ event, last }: { event: FixtureEvent; last: boolean }): React.JSX.Element { const { colors } = useTheme(); const showDescription = event.type === 'unknown' || event.type === 'var'; const eventColor = event.type === 'goal' ? colors.success : event.type === 'yellow_card' ? colors.warning : event.type === 'red_card' ? colors.danger : colors.primary; return <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 11, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.border }}><AppText weight="bold" color={colors.muted} style={{ width: 29 }}>{event.time === null ? '—' : `${event.time}'`}</AppText><AppText size={17} style={{ width: 22 }}>{eventIcon[event.type]}</AppText><View style={{ flex: 1, gap: 2 }}><AppText size={12} color={eventColor} weight="bold">{eventLabel[event.type]}</AppText>{event.type === 'substitution' ? <><AppText weight="bold">{event.player ? `↑ Entra: ${event.player}` : null}</AppText>{event.secondaryPlayer ? <AppText weight="bold">↓ Sale: ${event.secondaryPlayer}</AppText> : null}</> : event.player ? <AppText weight="bold">{event.player}</AppText> : null}{event.type === 'goal' && event.assist ? <AppText size={12} color={colors.muted}>Asistencia: {event.assist}</AppText> : null}{event.team ? <AppText size={12} color={colors.muted}>{event.team}</AppText> : null}{showDescription && event.description ? <AppText size={12} color={colors.muted}>{event.description}</AppText> : null}</View></View>; }
function StatisticRow({ stat }: { stat: MatchStatistic }): React.JSX.Element { const { colors } = useTheme(); return <View style={{ paddingVertical: 10, gap: 5 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><AppText weight="bold">{formatStat(stat.home)}</AppText><AppText size={12} color={colors.muted}>{stat.label}</AppText><AppText weight="bold">{formatStat(stat.away)}</AppText></View><View style={{ height: 5, backgroundColor: colors.border, borderRadius: 5 }} /></View>; }
function LineupTeam({ team, players, partial }: { team: Team; players: MatchLineupPlayer[]; partial: boolean }): React.JSX.Element { return <Card style={{ marginBottom: 12 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}><TeamLogo team={team} size={34} /><AppText size={17} weight="bold">{team.name}</AppText></View>{partial ? <LineupGroup title="Jugadores disponibles" players={players} /> : <><LineupGroup title="Titulares" players={players.filter((player) => player.substitute === false)} /><LineupGroup title="Suplentes" players={players.filter((player) => player.substitute === true)} />{players.every((player) => player.substitute === null) ? <LineupGroup title="Plantilla del partido" players={players} /> : null}{players.some((player) => player.substitute === null) && players.some((player) => player.substitute !== null) ? <LineupGroup title="Sin clasificación" players={players.filter((player) => player.substitute === null)} /> : null}</>}</Card>; }
function LineupGroup({ title, players }: { title: string; players: MatchLineupPlayer[] }): React.JSX.Element | null { const { colors } = useTheme(); if (!players.length) return null; return <View style={{ marginTop: 8 }}><AppText size={12} weight="bold" color={colors.muted} style={{ marginBottom: 4 }}>{title}</AppText>{sortLineup(players).map((player, index) => <LineupRow key={lineupKey(player, index)} player={player} />)}</View>; }
function sortLineup(players: MatchLineupPlayer[]): MatchLineupPlayer[] { const positionRank: Record<string, number> = { goalkeeper: 1, portero: 1, defender: 2, defensa: 2, midfielder: 3, mediocampista: 3, forward: 4, delantero: 4 }; return [...players].sort((left, right) => (positionRank[normalizeName(left.position ?? '')] ?? 99) - (positionRank[normalizeName(right.position ?? '')] ?? 99)); }
function lineupKey(player: MatchLineupPlayer, index: number): string { const stableId = player.id?.trim(); return stableId || `${player.teamId ?? player.team ?? 'equipo'}-${player.number ?? 'sin-dorsal'}-${player.player}-${index}`; }
function LineupRow({ player }: { player: MatchLineupPlayer }): React.JSX.Element { const { colors } = useTheme(); return <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}><View style={{ flex: 1 }}><AppText weight="bold">{player.player}</AppText>{player.position ? <AppText size={12} color={colors.muted}>{player.position}</AppText> : null}</View>{player.number !== null && player.number !== '' ? <AppText size={12} color={colors.muted}>{player.number}</AppText> : null}</View>; }
function formatStat(value: string | number | null): string { return value === null || value === '' ? '-' : String(value); }
