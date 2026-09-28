export interface SportsDbEvent {
  idEvent: string | null;
  strEvent: string | null;
  strHomeTeam: string | null;
  strAwayTeam: string | null;
  idHomeTeam: string | number | null;
  idAwayTeam: string | number | null;
  strHomeTeamBadge: string | null;
  strAwayTeamBadge: string | null;
  dateEvent: string | null;
  dateEventLocal: string | null;
  strTime: string | null;
  strTimeLocal: string | null;
  strTimestamp?: string | number | null;
  strVenue: string | null;
  strStatus: string | null;
  strSeason?: string | null;
  strLeague?: string | null;
  intHomeScore: string | number | null;
  intAwayScore: string | number | null;
  intRound: string | number | null;
  strThumb?: string | null;
  strVideo?: string | null;
}

export interface SportsDbStanding {
  team: { id: string; name: string; badge: string | null };
  rank: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: string | null;
}

export interface SportsDbStandingsResponse {
  data?: SportsDbStanding[];
  season?: string;
}

export interface SportsDbNextFixtureResponse {
  data: SportsDbEvent | null;
  season?: string;
}

export interface SportsDbFixturesResponse {
  data?: SportsDbEvent[];
  season?: string;
}

export interface SportsDbEventDetailResponse {
  data: SportsDbEvent | null;
}

export interface SportsDbTimelineEvent {
  idTimeline?: string | null;
  idEvent?: string | null;
  idPlayer?: string | number | null;
  strTime?: string | number | null;
  intTime?: string | number | null;
  strEvent?: string | null;
  strTimeline?: string | null;
  strTimelineDetail?: string | null;
  strTimelineType?: string | null;
  strPlayer?: string | null;
  strAssist?: string | null;
  strTeam?: string | null;
  strHome?: string | null;
  idTeam?: string | number | null;
  strType?: string | null;
  strDetail?: string | null;
  strCard?: string | null;
  strComment?: string | null;
  strComments?: string | null;
}

export interface SportsDbTimelineResponse {
  data?: SportsDbTimelineEvent[];
}

export interface SportsDbEventStat {
  strStat?: string | null;
  intHome?: string | number | null;
  intAway?: string | number | null;
  strHome?: string | number | null;
  strAway?: string | number | null;
}

export interface SportsDbEventStatsResponse {
  data?: SportsDbEventStat[];
}

export interface SportsDbLineupPlayer {
  idLineup?: string | null;
  idPlayer?: string | number | null;
  idTeam?: string | number | null;
  strPlayer?: string | null;
  strTeam?: string | null;
  strPosition?: string | null;
  strPositionShort?: string | null;
  strFormation?: string | null;
  strNumber?: string | number | null;
  strSubstitute?: string | number | null;
  strStarter?: string | number | null;
  strStarting?: string | number | null;
  strHome?: string | null;
}

export interface SportsDbLineupResponse {
  data?: SportsDbLineupPlayer[];
}
