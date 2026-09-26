const SPORTS_DB_BASE_URL = 'https://www.thesportsdb.com/api/v1/json/123';
const LIGA_MX_LEAGUE_ID = '4350';
const LIGA_MX_SEASON = '2026-2027';
const MAX_ROUNDS = 17;
const STANDINGS_CACHE_TTL = 45 * 60 * 1000;
const NEXT_FIXTURE_CACHE_TTL = 20 * 60 * 1000;
const FIXTURES_CACHE_TTL = 20 * 60 * 1000;
const ROUND_CACHE_TTL = 30 * 60 * 1000;
const EVENT_DATA_CACHE_TTL = 15 * 60 * 1000;

const finalStatuses = new Set(['FT', 'AET', 'PEN', 'FINISHED', 'MATCH FINISHED']);
const ignoredStatuses = new Set(['NS', 'TBD', 'PST', 'POSTPONED', 'CANC', 'CANCELLED', 'ABD', 'ABANDONED']);
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

interface SportsDbEvent {
  idEvent?: string | null;
  strEvent?: string | null;
  strHomeTeam?: string | null;
  strAwayTeam?: string | null;
  idHomeTeam?: string | number | null;
  idAwayTeam?: string | number | null;
  strHomeTeamBadge?: string | null;
  strAwayTeamBadge?: string | null;
  dateEvent?: string | null;
  dateEventLocal?: string | null;
  strTime?: string | null;
  strTimeLocal?: string | null;
  strVenue?: string | null;
  strStatus?: string | null;
  strSeason?: string | null;
  strLeague?: string | null;
  intHomeScore?: string | number | null;
  intAwayScore?: string | number | null;
  intRound?: string | number | null;
}

interface CacheEntry<T> { expiresAt: number; value: T; }
interface StandingRow {
  team: { id: string; name: string; badge: string | null };
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: string | null;
  rank?: number;
}
const cache = new Map<string, CacheEntry<unknown>>();

function json(data: unknown, status = 200): Response { return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
function getCached<T>(key: string): T | null { const entry = cache.get(key) as CacheEntry<T> | undefined; if (!entry) return null; if (entry.expiresAt <= Date.now()) { cache.delete(key); return null; } return entry.value; }
function setCached<T>(key: string, value: T, ttl: number): T { cache.set(key, { value, expiresAt: Date.now() + ttl }); return value; }
function endpoint(path: string, params: Record<string, string>): string { const url = new URL(`${SPORTS_DB_BASE_URL}/${path}`); for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value); return url.toString(); }
async function fetchSportsDb<T>(path: string, params: Record<string, string>): Promise<T> { const url = endpoint(path, params); console.log('football-proxy TheSportsDB URL:', url); const response = await fetch(url); const text = await response.text(); if (!response.ok) { console.error('football-proxy TheSportsDB error:', { status: response.status, body: text }); throw new Error(`TheSportsDB respondió ${response.status}.`); } try { return JSON.parse(text) as T; } catch { console.error('football-proxy TheSportsDB invalid JSON:', { status: response.status, body: text }); throw new Error('TheSportsDB devolvió una respuesta inválida.'); } }
function statusOf(event: SportsDbEvent): string { return (event.strStatus ?? '').trim().toUpperCase(); }
function scoreOf(value: string | number | null | undefined): number | null { const score = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN; return Number.isInteger(score) && score >= 0 ? score : null; }
function isFinished(event: SportsDbEvent): boolean { return finalStatuses.has(statusOf(event)) && scoreOf(event.intHomeScore) !== null && scoreOf(event.intAwayScore) !== null; }
function isIgnored(event: SportsDbEvent): boolean { return ignoredStatuses.has(statusOf(event)); }
async function fetchRound(round: number): Promise<{ events: SportsDbEvent[]; loaded: boolean }> { const key = `round:${LIGA_MX_LEAGUE_ID}:${LIGA_MX_SEASON}:${round}`; const cached = getCached<{ events: SportsDbEvent[]; loaded: boolean }>(key); if (cached) return cached; try { const payload = await fetchSportsDb<{ events?: SportsDbEvent[] | null }>('eventsround.php', { id: LIGA_MX_LEAGUE_ID, r: String(round), s: LIGA_MX_SEASON }); const result = { events: Array.isArray(payload.events) ? payload.events : [], loaded: true }; return setCached(key, result, ROUND_CACHE_TTL); } catch (error) { console.error('football-proxy round error:', { round, error: error instanceof Error ? error.message : error }); return { events: [], loaded: false }; } }
function teamKey(event: SportsDbEvent, side: 'home' | 'away'): string | null { const id = side === 'home' ? event.idHomeTeam : event.idAwayTeam; if (typeof id === 'number' && Number.isInteger(id)) return String(id); return typeof id === 'string' && id.trim() ? id.trim() : null; }
function teamName(event: SportsDbEvent, side: 'home' | 'away'): string { const name = side === 'home' ? event.strHomeTeam : event.strAwayTeam; return typeof name === 'string' && name.trim() ? name.trim() : 'Equipo sin nombre'; }
function teamBadge(event: SportsDbEvent, side: 'home' | 'away'): string | null { const badge = side === 'home' ? event.strHomeTeamBadge : event.strAwayTeamBadge; return typeof badge === 'string' && badge.trim() ? badge.trim() : null; }

function calculateStandings(events: SportsDbEvent[]): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  const ensureTeam = (event: SportsDbEvent, side: 'home' | 'away'): StandingRow | null => { const id = teamKey(event, side); if (!id) return null; const existing = rows.get(id); if (existing) { if (!existing.team.badge) existing.team.badge = teamBadge(event, side); return existing; } const row: StandingRow = { team: { id, name: teamName(event, side), badge: teamBadge(event, side) }, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, form: null }; rows.set(id, row); return row; };
  for (const event of events) { const home = ensureTeam(event, 'home'); const away = ensureTeam(event, 'away'); if (!home || !away || !isFinished(event)) continue; const homeGoals = scoreOf(event.intHomeScore); const awayGoals = scoreOf(event.intAwayScore); if (homeGoals === null || awayGoals === null) continue; home.played += 1; away.played += 1; home.goalsFor += homeGoals; home.goalsAgainst += awayGoals; away.goalsFor += awayGoals; away.goalsAgainst += homeGoals; if (homeGoals > awayGoals) { home.wins += 1; home.points += 3; away.losses += 1; } else if (homeGoals < awayGoals) { away.wins += 1; away.points += 3; home.losses += 1; } else { home.draws += 1; away.draws += 1; home.points += 1; away.points += 1; } }
  const result = [...rows.values()].map((row) => ({ ...row, goalDifference: row.goalsFor - row.goalsAgainst }));
  result.sort((left, right) => right.points - left.points || right.goalDifference - left.goalDifference || right.goalsFor - left.goalsFor || left.team.name.localeCompare(right.team.name, 'es'));
  return result.map((row, index) => ({ ...row, rank: index + 1 }));
}

async function getStandings(): Promise<{ data: StandingRow[]; season: string }> { const key = `standings:${LIGA_MX_LEAGUE_ID}:${LIGA_MX_SEASON}`; const cached = getCached<{ data: StandingRow[]; season: string }>(key); if (cached) return cached; const rounds = await Promise.all(Array.from({ length: MAX_ROUNDS }, (_, index) => fetchRound(index + 1))); if (!rounds.some((round) => round.loaded)) throw new Error('No pudimos consultar las jornadas de Liga MX.'); const events = rounds.flatMap((round) => round.events); return setCached(key, { data: calculateStandings(events), season: LIGA_MX_SEASON }, STANDINGS_CACHE_TTL); }
async function getFixtures(): Promise<{ data: SportsDbEvent[]; season: string }> { const key = `fixtures:${LIGA_MX_LEAGUE_ID}:${LIGA_MX_SEASON}`; const cached = getCached<{ data: SportsDbEvent[]; season: string }>(key); if (cached) return cached; const rounds = await Promise.all(Array.from({ length: MAX_ROUNDS }, (_, index) => fetchRound(index + 1))); if (!rounds.some((round) => round.loaded)) throw new Error('No pudimos consultar los partidos de Liga MX.'); const events = rounds.flatMap((round) => round.events); return setCached(key, { data: events, season: LIGA_MX_SEASON }, FIXTURES_CACHE_TTL); }
async function getNextFixture(teamId: string): Promise<{ data: SportsDbEvent | null; season: string }> { const key = `next-fixture:${teamId}`; const cached = getCached<{ data: SportsDbEvent | null; season: string }>(key); if (cached) return cached; const payload = await fetchSportsDb<{ events?: SportsDbEvent[] | null }>('eventsnext.php', { id: teamId }); const events = Array.isArray(payload.events) ? payload.events : []; const seasonEvents = events.filter((event) => !event.strSeason || event.strSeason === LIGA_MX_SEASON); const fixture = seasonEvents.filter((event) => !isIgnored(event) && !isFinished(event)).sort((left, right) => { const leftDate = `${left.dateEventLocal ?? left.dateEvent ?? ''}T${left.strTimeLocal ?? left.strTime ?? '00:00:00'}`; const rightDate = `${right.dateEventLocal ?? right.dateEvent ?? ''}T${right.strTimeLocal ?? right.strTime ?? '00:00:00'}`; return leftDate.localeCompare(rightDate); })[0] ?? null; return setCached(key, { data: fixture, season: LIGA_MX_SEASON }, NEXT_FIXTURE_CACHE_TTL); }
async function getEventDetail(eventId: string): Promise<{ data: SportsDbEvent | null }> { const key = `event-detail:${eventId}`; const cached = getCached<{ data: SportsDbEvent | null }>(key); if (cached) return cached; const payload = await fetchSportsDb<{ events?: SportsDbEvent[] | null }>('lookupevent.php', { id: eventId }); return setCached(key, { data: Array.isArray(payload.events) ? payload.events[0] ?? null : null }, EVENT_DATA_CACHE_TTL); }
async function getEventCollection(eventId: string, path: string, field: string): Promise<{ data: unknown[] }> { const key = `${path}:${eventId}`; const cached = getCached<{ data: unknown[] }>(key); if (cached) return cached; const payload = await fetchSportsDb<Record<string, unknown>>(path, { id: eventId }); const value = payload[field]; const data = Array.isArray(value) ? value : []; return setCached(key, { data }, EVENT_DATA_CACHE_TTL); }

interface FootballProxyRequest { action?: 'standings' | 'fixtures' | 'next-fixture' | 'event-detail' | 'event-timeline' | 'event-stats' | 'event-lineup'; teamId?: string | number; eventId?: string | number; params?: Record<string, string | number>; }
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await request.json() as FootballProxyRequest;
    console.log('football-proxy request:', { action: body.action ?? null, teamId: body.teamId ?? null, eventId: body.eventId ?? null, season: body.params?.season ?? LIGA_MX_SEASON });
    if (body.action === 'standings') return json(await getStandings());
    if (body.action === 'fixtures') return json(await getFixtures());
    if (body.action === 'next-fixture') {
      const teamId = String(body.teamId ?? '').trim();
      if (!/^\d+$/.test(teamId)) return json({ error: 'TheSportsDB teamId inválido.' }, 400);
      return json(await getNextFixture(teamId));
    }
    if (body.action === 'event-detail' || body.action === 'event-timeline' || body.action === 'event-stats' || body.action === 'event-lineup') {
      const eventId = String(body.eventId ?? '').trim();
      if (!/^\d+$/.test(eventId)) return json({ error: 'TheSportsDB eventId inválido.' }, 400);
      if (body.action === 'event-detail') return json(await getEventDetail(eventId));
      if (body.action === 'event-timeline') return json(await getEventCollection(eventId, 'lookuptimeline.php', 'timeline'));
      if (body.action === 'event-stats') return json(await getEventCollection(eventId, 'lookupeventstats.php', 'eventstats'));
      return json(await getEventCollection(eventId, 'lookuplineup.php', 'lineup'));
    }
    return json({ error: 'Acción no permitida.' }, 400);
  } catch (error) {
    console.error('football-proxy internal error:', error);
    return json({ error: error instanceof Error ? error.message : 'Solicitud inválida' }, 502);
  }
});
