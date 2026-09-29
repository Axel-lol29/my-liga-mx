import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { MatchFavoriteButton } from '../../components/MatchFavoriteButton';
import { MatchReminderButton } from '../../components/MatchReminderButton';
import { AppText, Card, MatchCard, Screen, StateView } from '../../components/ui';
import { useFavoriteMatches, useToggleFavoriteMatch } from '../../src/hooks/useFavoriteMatches';
import { useManualMatchReminders } from '../../src/hooks/useManualMatchReminders';
import { useSportsDbFixtures } from '../../src/hooks/useData';
import { useTheme } from '../../src/theme/ThemeProvider';
import { Fixture } from '../../src/types';
import { canSetMatchReminder } from '../../src/services/notifications/notificationService';
import { formatCompactMatchDateTime } from '../../src/utils/matchDateTime';
import { RoundSummaryRequest } from '../../src/services/ai/roundSummaryService';
import { useRoundSummary } from '../../src/hooks/useRoundSummary';

type Filter = 'all' | 'live' | 'scheduled' | 'finished';

export default function MatchesScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const query = useSportsDbFixtures();
  const favorites = useFavoriteMatches();
  const toggleFavorite = useToggleFavoriteMatch();
  const reminders = useManualMatchReminders();
  const allFixtures = query.data ?? [];
  const favoriteIds = new Set((favorites.data ?? []).map((match) => match.eventId));
  const statusFixtures = useMemo(() => filterFixturesByStatus(allFixtures, filter), [allFixtures, filter]);
  const rounds = useMemo(() => availableRounds(statusFixtures), [statusFixtures]);
  const effectiveRound = filter === 'live' || selectedRound === null || !rounds.includes(selectedRound) ? null : selectedRound;
  const fixtures = useMemo(() => sortFixtures(statusFixtures, filter, effectiveRound), [effectiveRound, filter, statusFixtures]);
  const roundFixtures = useMemo(
    () => effectiveRound === null ? [] : allFixtures.filter((fixture) => getRoundNumber(fixture) === effectiveRound),
    [allFixtures, effectiveRound],
  );
  const finishedRoundFixtures = useMemo(
    () => roundFixtures.filter((fixture) => fixture.status === 'finished'),
    [roundFixtures],
  );
  const summaryRequest = useMemo<RoundSummaryRequest | undefined>(() => {
    if (effectiveRound === null || roundFixtures.length === 0 || finishedRoundFixtures.length === 0) return undefined;
    return {
      round: effectiveRound,
      totalMatches: roundFixtures.length,
      matches: finishedRoundFixtures.map((fixture) => ({
        homeTeam: fixture.homeTeam.name,
        awayTeam: fixture.awayTeam.name,
        homeScore: fixture.homeGoals,
        awayScore: fixture.awayGoals,
        status: 'finished',
      })),
    };
  }, [effectiveRound, finishedRoundFixtures, roundFixtures.length]);
  const roundSummary = useRoundSummary(summaryRequest);
  const roundIsComplete = roundFixtures.length > 0 && finishedRoundFixtures.length === roundFixtures.length;

  useEffect(() => {
    if (filter !== 'live' && selectedRound !== null && !rounds.includes(selectedRound)) setSelectedRound(null);
  }, [filter, rounds, selectedRound]);

  return <Screen refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
    <AppText size={12} color={colors.primary} weight="bold">MY LIGA MX · JORNADA</AppText>
    <AppText size={30} weight="bold">Partidos</AppText>
    <AppText color={colors.muted}>Liga MX · temporada configurada</AppText>

    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 20, marginBottom: 14, padding: 5, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
      {(['all', 'live', 'scheduled', 'finished'] as Filter[]).map((value) => <FilterChip key={value} value={value} active={filter === value} onPress={() => setFilter(value)} />)}
    </View>

    {filter !== 'live' && rounds.length > 0 ? <>
      <AppText size={13} weight="bold" color={colors.muted} style={{ marginBottom: 6 }}>Jornada</AppText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ height: 48, flexGrow: 0, flexShrink: 0 }}
        contentContainerStyle={{ alignItems: 'center', gap: 8, paddingVertical: 2, paddingRight: 4 }}
      >
        <RoundChip label="Todas" active={selectedRound === null} onPress={() => setSelectedRound(null)} />
        {rounds.map((round) => <RoundChip key={round} label={`J${round}`} active={selectedRound === round} onPress={() => setSelectedRound(round)} />)}
      </ScrollView>
    </> : null}

    {summaryRequest ? <Card style={{ marginTop: 14, marginBottom: 2, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <AppText size={17} weight="bold">{roundIsComplete ? 'Resumen de la jornada' : 'Resumen parcial'}</AppText>
        <AppText size={12} color={colors.muted}>Jornada {summaryRequest.round}</AppText>
      </View>
      {!roundIsComplete ? <AppText size={12} color={colors.muted}>
        Resumen parcial · {finishedRoundFixtures.length} de {roundFixtures.length} partidos finalizados
      </AppText> : null}

      {roundSummary.summary ? <>
        <AppText>{roundSummary.summary}</AppText>
        {roundSummary.highlights.length > 0 ? <View style={{ gap: 6, marginTop: 2 }}>
          <AppText size={13} weight="bold">Puntos clave</AppText>
          {roundSummary.highlights.map((highlight, index) => <View key={`${summaryRequest.round}-${index}`} style={{ flexDirection: 'row', gap: 8 }}>
            <AppText color={colors.primaryLight}>•</AppText>
            <AppText size={13} color={colors.muted} style={{ flex: 1 }}>{highlight}</AppText>
          </View>)}
        </View> : null}
        <AppText size={11} color={colors.mutedSubtle}>
          Generado con IA a partir de resultados de la jornada.
        </AppText>
        {formatSummaryUpdatedAt(roundSummary.data?.generatedAt) ? <AppText size={11} color={colors.mutedSubtle}>
          Actualizado {formatSummaryUpdatedAt(roundSummary.data?.generatedAt)}
        </AppText> : null}
      </> : <>
        {roundSummary.data?.pending ? <AppText size={13} color={colors.muted}>
          El resumen se está generando. Intenta de nuevo en un momento.
        </AppText> : null}
        {roundSummary.hasGenerationError ? <AppText size={13} color={colors.danger}>
          No pudimos generar el resumen en este momento.
        </AppText> : null}
        {roundSummary.isError ? <View style={{ gap: 2 }}>
          <AppText size={13} color={colors.muted}>No pudimos revisar un resumen guardado.</AppText>
          <Pressable accessibilityRole="button" onPress={() => void roundSummary.refetch()} style={{ minHeight: 40, justifyContent: 'center', alignSelf: 'flex-start' }}>
            <AppText size={12} color={colors.primaryLight} weight="bold">Reintentar consulta</AppText>
          </Pressable>
        </View> : null}
        <Pressable
          accessibilityRole="button"
          disabled={roundSummary.isPendingGeneration || roundSummary.isLoading}
          onPress={roundSummary.generate}
          style={({ pressed }) => ({ minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 14, paddingHorizontal: 14, backgroundColor: colors.primary, opacity: roundSummary.isPendingGeneration || roundSummary.isLoading ? 0.65 : pressed ? 0.82 : 1 })}
        >
          {roundSummary.isPendingGeneration || roundSummary.isLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
          <AppText size={14} weight="bold" color="#FFFFFF">
            {roundSummary.isPendingGeneration ? 'Generando resumen…' : roundSummary.isLoading ? 'Revisando resumen…' : roundSummary.hasGenerationError ? 'Reintentar' : roundSummary.data?.pending ? 'Revisar resumen' : 'Generar resumen'}
          </AppText>
        </Pressable>
      </>}
    </Card> : null}

    <View style={{ marginTop: 14 }}>
      {query.isLoading
        ? <StateView kind="loading" />
        : query.isError
          ? <StateView kind="error" message={query.error instanceof Error ? query.error.message : undefined} onRetry={() => void query.refetch()} />
          : fixtures.length
            ? fixtures.map((fixture) => {
              const eventId = fixture.idEvent?.trim();
              const isFavorite = Boolean(eventId && favoriteIds.has(eventId));
              const hasReminder = Boolean(eventId && reminders.eventIds.includes(eventId));
              const canRemind = canSetMatchReminder(fixture);
              return <MatchCard
                key={fixture.id}
                fixture={fixture}
                dateTimeLabel={formatCompactMatchDateTime(fixture.timestamp, fixture.date) ?? 'Fecha no disponible'}
                onPress={() => {
                  if (!eventId) return;
                  console.log('MATCH PRESS:', { id: fixture.id, rawIdEvent: fixture.idEvent, home: fixture.homeTeam, away: fixture.awayTeam });
                  router.push({ pathname: '/match/[id]', params: { id: eventId } });
                }}
                favoriteControl={eventId ? <MatchFavoriteButton
                  compact
                  isFavorite={isFavorite}
                  pending={toggleFavorite.isPending && toggleFavorite.variables?.fixture.idEvent === eventId}
                  disabled={favorites.isLoading || favorites.isError}
                  onPress={() => toggleFavorite.mutate({ fixture, shouldSave: !isFavorite })}
                /> : undefined}
                reminderControl={canRemind && eventId ? <MatchReminderButton
                  isEnabled={hasReminder}
                  pending={reminders.isUpdating && reminders.updatingEventId === eventId}
                  disabled={reminders.isLoading || reminders.isError}
                  onPress={() => {
                    if (!canSetMatchReminder(fixture)) return;
                    reminders.setReminder({ eventId, enabled: !hasReminder });
                  }}
                /> : undefined}
              />;
            })
            : <StateView kind="empty" message={emptyMessage(filter, effectiveRound)} />}
    </View>
  </Screen>;
}

function formatSummaryUpdatedAt(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function availableRounds(fixtures: Fixture[]): number[] {
  const rounds = new Set<number>();
  for (const fixture of fixtures) {
    const round = getRoundNumber(fixture);
    if (round !== null) rounds.add(round);
  }
  return [...rounds].sort((left, right) => left - right);
}

function filterFixturesByStatus(fixtures: Fixture[], filter: Filter): Fixture[] {
  return filter === 'all' ? fixtures : fixtures.filter((fixture) => fixture.status === filter);
}

function emptyMessage(filter: Filter, selectedRound: number | null): string {
  if (selectedRound !== null) return 'No hay partidos para esta jornada y filtro.';
  if (filter === 'scheduled') return 'No hay próximos partidos disponibles.';
  if (filter === 'finished') return 'No hay partidos finalizados disponibles.';
  if (filter === 'live') return 'No hay partidos en vivo disponibles.';
  return 'No hay partidos disponibles para este filtro.';
}

function getRoundNumber(fixture: Fixture): number | null {
  const value = fixture.round?.trim();
  if (!value) return null;
  const match = value.match(/(?:jornada|round|matchday|week)\s*#?\s*(\d+)/i) ?? value.match(/^\s*j?\s*(\d+)\s*$/i);
  if (!match) return null;
  const round = Number(match[1]);
  return Number.isInteger(round) && round > 0 ? round : null;
}

function sortFixtures(fixtures: Fixture[], filter: Filter, selectedRound: number | null): Fixture[] {
  const filtered = selectedRound === null ? fixtures : fixtures.filter((fixture) => getRoundNumber(fixture) === selectedRound);
  return [...filtered].sort((left, right) => {
    const leftTime = left.timestamp;
    const rightTime = right.timestamp;
    if (leftTime === null) return rightTime === null ? 0 : 1;
    if (rightTime === null) return -1;
    return filter === 'finished' ? rightTime - leftTime : leftTime - rightTime;
  });
}

function FilterChip({ value, active, onPress }: { value: Filter; active: boolean; onPress: () => void }): React.JSX.Element {
  const { colors } = useTheme();
  const labels: Record<Filter, string> = { all: 'Todos', live: 'En vivo', scheduled: 'Próximos', finished: 'Finalizados' };
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 20, backgroundColor: active ? colors.primary : colors.surface, borderWidth: 1, borderColor: active ? colors.primary : colors.border }}>
    <AppText size={12} weight="bold" color={active ? '#FFF' : colors.muted}>{labels[value]}</AppText>
  </Pressable>;
}

function RoundChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }): React.JSX.Element {
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={{ height: 44, minHeight: 44, minWidth: 48, flexGrow: 0, flexShrink: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, borderRadius: 20, backgroundColor: active ? colors.primary : colors.surface, borderWidth: 1, borderColor: active ? colors.primary : colors.border }}>
    <AppText size={12} weight="bold" color={active ? '#FFF' : colors.muted}>{label}</AppText>
  </Pressable>;
}
