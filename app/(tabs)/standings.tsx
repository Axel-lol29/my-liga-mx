import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { AppText, Card, Screen, StateView, TeamLogo } from '../../components/ui';
import { useAuth } from '../../src/context/AuthProvider';
import { useStandings } from '../../src/hooks/useData';
import { useTheme } from '../../src/theme/ThemeProvider';
import { Standing } from '../../src/types';
import { getSportsDbTeamId } from '../../src/services/sportsDb/config';
import { getTeamByInternalId, getTeamBySportsDbId } from '../../src/constants/ligaMxTeams';

export default function StandingsScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const { width } = useWindowDimensions();
  const compact = width < 680;
  const query = useStandings();
  const favoriteTeam = getTeamByInternalId(profile?.favoriteTeamId);

  return <Screen refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
    <View style={styles.headingRow}>
      <View style={[styles.identityMark, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '55' }]}><AppText color={colors.primary} size={13} weight="bold">MX</AppText></View>
      <View style={styles.headingCopy}><AppText size={12} color={colors.primary} weight="bold">MY LIGA MX · OFICIAL</AppText><AppText size={30} weight="bold">Tabla de posiciones</AppText><AppText color={colors.muted}>Liga MX · temporada configurada</AppText></View>
    </View>
    <View style={styles.legend}><LegendItem color="#D6B45A" label="Top 3" /><LegendItem color={colors.primary} label="Zona de clasificación" /><LegendItem color={colors.border} label="Resto" /></View>
    {query.isLoading ? <StateView kind="loading" /> : query.isError ? <StateView kind="error" message={query.error instanceof Error ? query.error.message : undefined} onRetry={() => void query.refetch()} /> : !query.data?.length ? <StateView kind="empty" message="No hay tabla disponible. Verifica la temporada y API-Football." /> : <Card style={styles.tableCard}>
      <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
        <View style={styles.rankColumn}><AppText size={11} color={colors.muted} weight="bold">#</AppText></View>
        <View style={styles.teamColumn}><AppText size={11} color={colors.muted} weight="bold">EQUIPO</AppText></View>
        {compact ? <View style={styles.pointsColumn}><AppText size={11} color={colors.muted} weight="bold">PTS</AppText></View> : <><StatHeader label="PJ" /><StatHeader label="G" /><StatHeader label="E" /><StatHeader label="P" /><StatHeader label="GF" /><StatHeader label="GC" /><StatHeader label="DG" /><View style={styles.pointsColumn}><AppText size={11} color={colors.muted} weight="bold">PTS</AppText></View></>}
      </View>
      {query.data.map((row) => {
        const catalogTeam = getTeamBySportsDbId(row.team.id) ?? getTeamByInternalId(row.team.id);
        const favorite = Boolean(favoriteTeam && catalogTeam?.internalId === favoriteTeam.internalId);
        return <StandingRow key={row.team.id} row={row} favorite={favorite} compact={compact} />;
      })}
    </Card>}
  </Screen>;
}

function StatHeader({ label }: { label: string }): React.JSX.Element { const { colors } = useTheme(); return <View style={styles.statColumn}><AppText size={11} color={colors.muted} weight="bold">{label}</AppText></View>; }
function StatValue({ value, emphasis = false }: { value: number; emphasis?: boolean }): React.JSX.Element { return <View style={styles.statColumn}><AppText size={13} weight={emphasis ? 'bold' : 'medium'}>{value}</AppText></View>; }
function LegendItem({ color, label }: { color: string; label: string }): React.JSX.Element { return <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: color }]} /><AppText size={11} color="#AAB4C0">{label}</AppText></View>; }
function getPositionStyle(rank: number, colors: ReturnType<typeof useTheme>['colors']): { accentColor: string; badgeBackground: string; rankColor: string; rowBackground: string; borderColor: string } { if (rank === 1) { return { accentColor: '#D6B45A', badgeBackground: '#D6B45A26', rankColor: '#D6B45A', rowBackground: '#D6B45A08', borderColor: '#D6B45A55' }; } if (rank === 2) { return { accentColor: '#B9C4D0', badgeBackground: '#B9C4D026', rankColor: '#B9C4D0', rowBackground: '#B9C4D008', borderColor: '#B9C4D045' }; } if (rank === 3) { return { accentColor: '#9DB9D4', badgeBackground: '#9DB9D426', rankColor: '#9DB9D4', rowBackground: '#9DB9D408', borderColor: '#9DB9D445' }; } if (rank <= 8) { return { accentColor: colors.primary, badgeBackground: colors.primary + '1F', rankColor: colors.primary, rowBackground: colors.primary + '08', borderColor: colors.primary + '45' }; } return { accentColor: colors.border, badgeBackground: colors.background, rankColor: colors.muted, rowBackground: colors.surface, borderColor: colors.border }; }
function StandingRow({ row, favorite, compact }: { row: Standing; favorite: boolean; compact: boolean }): React.JSX.Element { const { colors } = useTheme(); const positionStyle = getPositionStyle(row.rank, colors); const classification = row.rank <= 8; const rowBackground = favorite && !classification ? colors.primary + '12' : positionStyle.rowBackground; const borderColor = favorite ? colors.primary + 'B0' : positionStyle.borderColor; const borderLeftWidth = classification || favorite ? 3 : 1; const routeId = getSportsDbTeamId(row.team) ?? String(row.team.id); return <Pressable onPress={() => router.push(`/team/${routeId}`)} style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}><Card style={[styles.tableRow, { backgroundColor: rowBackground, borderColor, borderWidth: favorite ? 1.5 : 1, borderLeftColor: favorite && !classification ? colors.primary : positionStyle.accentColor, borderLeftWidth }]}><View style={styles.rankColumn}><View style={[styles.rankBadge, { backgroundColor: positionStyle.badgeBackground }]}><AppText size={13} weight="bold" color={positionStyle.rankColor}>{row.rank}</AppText></View></View><View style={styles.teamColumn}><View style={styles.teamCell}><TeamLogo team={row.team} size={compact ? 34 : 40} /><View style={styles.teamCopy}><AppText size={compact ? 14 : 15} weight={favorite || row.rank === 1 ? 'bold' : 'medium'}>{row.team.name}</AppText>{favorite ? <View style={[styles.favoriteBadge, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '55' }]}><AppText size={9} color={colors.primary} weight="bold">TU EQUIPO</AppText></View> : null}</View></View></View>{compact ? <View style={styles.pointsColumn}><AppText size={17} weight="bold" color={favorite ? colors.primary : undefined}>{row.points}</AppText></View> : <><StatValue value={row.played} /><StatValue value={row.wins} /><StatValue value={row.draws} /><StatValue value={row.losses} /><StatValue value={row.goalsFor} /><StatValue value={row.goalsAgainst} /><StatValue value={row.goalDifference} /><View style={styles.pointsColumn}><AppText size={16} weight="bold" color={favorite ? colors.primary : undefined}>{row.points}</AppText></View></>}</Card></Pressable>; }

const styles = StyleSheet.create({ headingRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 }, identityMark: { width: 46, height: 46, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, headingCopy: { flex: 1, gap: 3 }, legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12, paddingHorizontal: 4 }, legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 }, legendDot: { width: 7, height: 7, borderRadius: 4 }, tableCard: { padding: 10, borderRadius: 22 }, tableHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 10, borderBottomWidth: 1, gap: 4 }, tableRow: { flexDirection: 'row', alignItems: 'center', minHeight: 64, paddingVertical: 9, paddingHorizontal: 8, marginTop: 7, gap: 4, borderRadius: 15 }, rankColumn: { width: 34, alignItems: 'center', justifyContent: 'center' }, rankBadge: { width: 27, height: 27, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, teamColumn: { flex: 1, minWidth: 0 }, teamCell: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 }, teamCopy: { flex: 1, minWidth: 0 }, favoriteBadge: { alignSelf: 'flex-start', marginTop: 2, paddingHorizontal: 5, paddingVertical: 1, borderWidth: 1, borderRadius: 5 }, statColumn: { width: 35, alignItems: 'center', justifyContent: 'center' }, pointsColumn: { width: 47, alignItems: 'center', justifyContent: 'center' } });
