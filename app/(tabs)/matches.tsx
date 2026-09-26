import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { MatchFavoriteButton } from '../../components/MatchFavoriteButton';
import { AppText, MatchCard, Screen, StateView } from '../../components/ui';
import { useFavoriteMatches, useToggleFavoriteMatch } from '../../src/hooks/useFavoriteMatches';
import { useSportsDbFixtures } from '../../src/hooks/useData';
import { useTheme } from '../../src/theme/ThemeProvider';
import { Fixture } from '../../src/types';

type Filter = 'all' | 'live' | 'scheduled' | 'finished';

export default function MatchesScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const query = useSportsDbFixtures();
  const favorites = useFavoriteMatches();
  const toggleFavorite = useToggleFavoriteMatch();
  const allFixtures = query.data ?? [];
  const favoriteIds = new Set((favorites.data ?? []).map((match) => match.eventId));
  const rounds = useMemo(() => availableRounds(allFixtures), [allFixtures]);
  const effectiveRound = filter === 'live' ? null : selectedRound;
  const fixtures = useMemo(() => sortFixtures(allFixtures, filter, effectiveRound), [allFixtures, effectiveRound, filter]);

  return <Screen refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
    <AppText size={12} color={colors.primary} weight="bold">MY LIGA MX · JORNADA</AppText>
    <AppText size={30} weight="bold">Partidos</AppText>
    <AppText color={colors.muted}>Liga MX · temporada configurada</AppText>

    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 20, marginBottom: 14, padding: 5, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
      {(['all', 'live', 'scheduled', 'finished'] as Filter[]).map((value) => <FilterChip key={value} value={value} active={filter === value} onPress={() => setFilter(value)} />)}
    </View>

    {filter !== 'live' ? <>
      <AppText size={13} weight="bold" color={colors.muted} style={{ marginBottom: 6 }}>Jornada</AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4, paddingRight: 4 }}>
        <RoundChip label="Todas" active={selectedRound === null} onPress={() => setSelectedRound(null)} />
        {rounds.map((round) => <RoundChip key={round} label={`J${round}`} active={selectedRound === round} onPress={() => setSelectedRound(round)} />)}
      </ScrollView>
    </> : null}

    <View style={{ marginTop: 14 }}>
      {query.isLoading
        ? <StateView kind="loading" />
        : query.isError
          ? <StateView kind="error" message={query.error instanceof Error ? query.error.message : undefined} onRetry={() => void query.refetch()} />
          : fixtures.length
            ? fixtures.map((fixture) => {
              const eventId = fixture.idEvent?.trim();
              const isFavorite = Boolean(eventId && favoriteIds.has(eventId));
              return <MatchCard
                key={fixture.id}
                fixture={fixture}
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
              />;
            })
            : <StateView kind="empty" message={effectiveRound === null ? 'No hay partidos disponibles para este filtro.' : 'No hay partidos para esta jornada y filtro.'} />}
    </View>
  </Screen>;
}

function availableRounds(fixtures: Fixture[]): number[] {
  const rounds = new Set<number>();
  for (const fixture of fixtures) {
    const round = getRoundNumber(fixture);
    if (round !== null) rounds.add(round);
  }
  return [...rounds].sort((left, right) => left - right);
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
  const filtered = fixtures.filter((fixture) => {
    const matchesStatus = filter === 'all' || fixture.status === filter;
    const matchesRound = selectedRound === null || getRoundNumber(fixture) === selectedRound;
    return matchesStatus && matchesRound;
  });
  return [...filtered].sort((left, right) => {
    const leftTime = left.timestamp ?? 0;
    const rightTime = right.timestamp ?? 0;
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
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={{ minHeight: 40, minWidth: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 13, borderRadius: 20, backgroundColor: active ? colors.primary : colors.surface, borderWidth: 1, borderColor: active ? colors.primary : colors.border }}>
    <AppText size={12} weight="bold" color={active ? '#FFF' : colors.muted}>{label}</AppText>
  </Pressable>;
}
