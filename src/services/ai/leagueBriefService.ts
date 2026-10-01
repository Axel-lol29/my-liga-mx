import { supabase } from '../../lib/supabase';
import { withTransientRetry } from './transientRetry';

export interface LeagueBriefStanding {
  position: number;
  team: string;
  points: number;
  played: number;
}

export interface LeagueBriefMatch {
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  localDateTime: string | null;
  round: string | null;
  venue?: string | null;
}

export interface LeagueBriefNews {
  title: string;
  description: string | null;
  localDateTime: string | null;
}

export interface LeagueBriefRequest {
  leagueId: string;
  season: string;
  currentRound: string | null;
  nextRound: string | null;
  standings: LeagueBriefStanding[];
  recentResults: LeagueBriefMatch[];
  upcomingMatches: LeagueBriefMatch[];
  news: LeagueBriefNews[];
}

export interface LeagueBriefResponse {
  summary: string | null;
  highlights: string[];
  cached: boolean;
  pending: boolean;
  generatedAt: string | null;
}

export const leagueBriefQueryKey = (request: LeagueBriefRequest) => ['ai-league-brief', request] as const;

function isLeagueBriefResponse(value: unknown): value is LeagueBriefResponse {
  if (typeof value !== 'object' || value === null) return false;
  const response = value as Partial<LeagueBriefResponse>;
  return (typeof response.summary === 'string' || response.summary === null) &&
    Array.isArray(response.highlights) && response.highlights.length <= 3 &&
    response.highlights.every((item) => typeof item === 'string') &&
    typeof response.cached === 'boolean' && typeof response.pending === 'boolean' &&
    (typeof response.generatedAt === 'string' || response.generatedAt === null);
}

export async function generateLeagueBrief(request: LeagueBriefRequest): Promise<LeagueBriefResponse> {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const client = supabase;
  const data = await withTransientRetry('league-brief', async () => {
    const { data: responseData, error } = await client.functions.invoke('ai-league-brief', {
      body: { ...request, generate: true },
    });
    if (error) throw error;
    return responseData;
  });
  if (!isLeagueBriefResponse(data)) throw new Error('Respuesta del resumen de Liga MX inválida.');
  return data;
}
