import { getTeams } from '../apiFootball/teamsService';
import { footballRequest } from '../apiFootball/apiFootballClient';
import { Fixture, FixtureEvent, MatchLineupPlayer, MatchStatistic, Standing, Team } from '../../types';
import { getSportsDbTeamId, normalizeTeamName, SPORTS_DB_LEAGUE_ID, SPORTS_DB_SEASON } from './config';
import { translateAndSortStatistics, translatePlayerPosition } from './presentation';
import { SportsDbEvent, SportsDbEventDetailResponse, SportsDbEventStat, SportsDbEventStatsResponse, SportsDbFixturesResponse, SportsDbLineupResponse, SportsDbNextFixtureResponse, SportsDbStandingsResponse, SportsDbTimelineEvent, SportsDbTimelineResponse } from './types';

function numberValue(value: string | number | null | undefined): number | null {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function dateValue(event: SportsDbEvent): string {
  const date = event.dateEventLocal ?? event.dateEvent ?? '';
  const time = event.strTimeLocal ?? event.strTime;
  return date && time ? `${date}T${time}` : date;
}

function statusValue(event: SportsDbEvent): Fixture['status'] {
  const status = (event.strStatus ?? '').toLowerCase();
  if (['ft', 'aet', 'pen', 'finished', 'match finished'].includes(status)) return 'finished';
  if (['live', 'in play', '1h', 'ht', '2h', '3h', 'et'].includes(status)) return 'live';
  if (['pst', 'postponed'].includes(status)) return 'postponed';
  if (['canc', 'cancelled', 'abd', 'abandoned'].includes(status)) return 'cancelled';
  return 'scheduled';
}

function teamFromEvent(id: string | number | null, name: string | null, badge: string | null): Team {
  return { id: Number(id ?? 0), name: name?.trim() || 'Equipo sin nombre', code: null, logo: badge, country: 'México', founded: null, venue: null, city: null };
}

export function mapSportsDbFixture(event: SportsDbEvent): Fixture {
  const homeGoals = numberValue(event.intHomeScore);
  const awayGoals = numberValue(event.intAwayScore);
  const date = dateValue(event);
  return {
    id: Number(event.idEvent ?? 0),
    idEvent: event.idEvent,
    date,
    timestamp: date ? Date.parse(date) : null,
    status: statusValue(event),
    statusShort: event.strStatus ?? 'NS',
    elapsed: null,
    venue: event.strVenue,
    homeTeam: teamFromEvent(event.idHomeTeam, event.strHomeTeam, event.strHomeTeamBadge),
    awayTeam: teamFromEvent(event.idAwayTeam, event.strAwayTeam, event.strAwayTeamBadge),
    homeGoals,
    awayGoals,
    round: event.intRound ? `Jornada ${event.intRound}` : null,
  };
}

function mergeAppTeam(sportsTeam: { id: string; name: string; badge: string | null }, appTeams: Team[]): Team {
  const match = appTeams.find((team) => getSportsDbTeamId(team) === sportsTeam.id) ?? appTeams.find((team) => normalizeTeamName(team.name) === normalizeTeamName(sportsTeam.name));
  return match ? { ...match, logo: match.logo ?? sportsTeam.badge } : { id: Number(sportsTeam.id), name: sportsTeam.name, code: null, logo: sportsTeam.badge, country: 'México', founded: null, venue: null, city: null };
}

export async function getSportsDbStandings(): Promise<Standing[]> {
  const response = await footballRequest<SportsDbStandingsResponse>({ action: 'standings', params: { leagueId: SPORTS_DB_LEAGUE_ID, season: SPORTS_DB_SEASON } });
  let appTeams: Team[] = [];
  try { appTeams = await getTeams(); } catch { appTeams = []; }
  return (response.data ?? []).map((row) => ({ rank: row.rank, team: mergeAppTeam(row.team, appTeams), played: row.played, wins: row.wins, draws: row.draws, losses: row.losses, goalsFor: row.goalsFor, goalsAgainst: row.goalsAgainst, goalDifference: row.goalDifference, points: row.points, form: row.form }));
}

export async function getSportsDbFixtures(): Promise<Fixture[]> {
  const response = await footballRequest<SportsDbFixturesResponse>({ action: 'fixtures', params: { leagueId: SPORTS_DB_LEAGUE_ID, season: SPORTS_DB_SEASON } });
  return (response.data ?? []).map(mapSportsDbFixture).filter((fixture) => fixture.id > 0);
}

export async function getSportsDbEventDetail(eventId: string): Promise<Fixture | null> {
  const response = await footballRequest<SportsDbEventDetailResponse>({ action: 'event-detail', eventId });
  return response.data ? mapSportsDbFixture(response.data) : null;
}

function timelineTime(value: string | number | null | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^\d+/);
  return match ? Number(match[0]) : null;
}

function timelineType(event: SportsDbTimelineEvent): FixtureEvent['type'] {
  const value = `${event.strType ?? ''} ${event.strEvent ?? ''} ${event.strTimeline ?? ''} ${event.strTimelineType ?? ''} ${event.strTimelineDetail ?? ''} ${event.strDetail ?? ''} ${event.strCard ?? ''}`.toLowerCase();
  if (value.includes('goal') || value.includes('gol')) return 'goal';
  if (value.includes('red') || value.includes('roja')) return 'red_card';
  if (value.includes('card') || value.includes('tarjeta') || value.includes('yellow') || value.includes('amarilla')) return 'yellow_card';
  if (value.includes('subst') || value.includes('cambio') || value.includes('substitution')) return 'substitution';
  if (value.includes('var')) return 'var';
  return 'unknown';
}

export async function getSportsDbEventTimeline(eventId: string): Promise<FixtureEvent[]> {
  const response = await footballRequest<SportsDbTimelineResponse>({ action: 'event-timeline', eventId });
  return (response.data ?? []).map((event, index) => {
    const description = event.strTimelineDetail ?? event.strDetail ?? event.strComment ?? event.strComments ?? event.strTimeline ?? event.strEvent ?? event.strTimelineType ?? null;
    return { id: event.idTimeline ?? null, time: timelineTime(event.intTime ?? event.strTime), type: timelineType(event), detail: description, description, player: event.strPlayer ?? null, assist: event.strAssist ?? null, secondaryPlayer: event.strAssist ?? null, team: event.strTeam ?? null, teamId: event.idTeam === null || event.idTeam === undefined ? null : Number(event.idTeam), sourceIndex: index };
  }).filter((event) => event.player || event.description || event.time !== null).sort((left, right) => (left.time === null ? 1 : right.time === null ? -1 : left.time - right.time) || left.sourceIndex - right.sourceIndex).map(({ sourceIndex: _sourceIndex, ...event }) => event);
}

function statisticValue(stat: SportsDbEventStat, side: 'home' | 'away'): string | number | null {
  const value = side === 'home' ? stat.strHome ?? stat.intHome : stat.strAway ?? stat.intAway;
  return value === undefined ? null : value;
}

export async function getSportsDbEventStatistics(eventId: string): Promise<MatchStatistic[]> {
  const response = await footballRequest<SportsDbEventStatsResponse>({ action: 'event-stats', eventId });
  return translateAndSortStatistics((response.data ?? []).filter((stat) => stat.strStat).map((stat) => ({ label: stat.strStat as string, home: statisticValue(stat, 'home'), away: statisticValue(stat, 'away') })));
}

function isSubstitute(value: string | number | null | undefined): boolean | null {
  if (value === null || value === undefined || value === '') return null;
  return ['1', 'true', 'yes', 'si', 'substitute'].includes(String(value).toLowerCase());
}

function isStarter(value: string | number | null | undefined): boolean | null {
  if (value === null || value === undefined || value === '') return null;
  const normalized = String(value).toLowerCase();
  if (['1', 'true', 'yes', 'si', 'starter', 'starting'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'none', 'substitute'].includes(normalized)) return false;
  return null;
}

function isHomeSide(value: string | null | undefined): boolean | null {
  if (value === null || value === undefined || value === '') return null;
  const normalized = value.toLowerCase();
  if (['1', 'true', 'yes', 'si', 'home', 'local'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'away', 'visitante'].includes(normalized)) return false;
  return null;
}

export async function getSportsDbEventLineup(eventId: string): Promise<MatchLineupPlayer[]> {
  const response = await footballRequest<SportsDbLineupResponse>({ action: 'event-lineup', eventId });
  return (response.data ?? []).map((player) => { const starter = isStarter(player.strStarter ?? player.strStarting); return { id: player.idLineup ?? (player.idPlayer === null || player.idPlayer === undefined ? null : String(player.idPlayer)), player: player.strPlayer?.trim() ?? '', team: player.strTeam ?? null, teamId: player.idTeam === null || player.idTeam === undefined ? null : Number(player.idTeam), home: isHomeSide(player.strHome), position: translatePlayerPosition(player.strPosition ?? player.strPositionShort), number: player.strNumber ?? null, substitute: player.strSubstitute !== null && player.strSubstitute !== undefined ? isSubstitute(player.strSubstitute) : starter === null ? null : !starter }; }).filter((player) => player.player.length > 0);
}

export async function getNextFixture(team: Team): Promise<Fixture | null> {
  const teamId = getSportsDbTeamId(team);
  if (!teamId) return null;
  try {
    const response = await footballRequest<SportsDbNextFixtureResponse>({ action: 'next-fixture', teamId, params: { leagueId: SPORTS_DB_LEAGUE_ID, season: SPORTS_DB_SEASON } });
    if (response.data) return mapSportsDbFixture(response.data);
  } catch (error) {
    console.warn('No se pudo obtener el próximo partido por equipo; se usará el calendario de Liga MX.', error);
  }
  const numericTeamId = Number(teamId);
  const fixtures = await getSportsDbFixtures();
  return fixtures
    .filter((fixture) => fixture.status === 'scheduled' && fixture.timestamp !== null && fixture.timestamp > Date.now() && (fixture.homeTeam.id === numericTeamId || fixture.awayTeam.id === numericTeamId))
    .sort((left, right) => (left.timestamp ?? Number.MAX_SAFE_INTEGER) - (right.timestamp ?? Number.MAX_SAFE_INTEGER))[0] ?? null;
}
