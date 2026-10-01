import { supabase } from '../../lib/supabase';
import { withTransientRetry } from './transientRetry';

export interface TeamBriefMatch {
  homeTeam: string;
  awayTeam: string;
  homeScore?: number | null;
  awayScore?: number | null;
  localDateTime?: string | null;
  venue?: string | null;
}

export interface TeamBriefStanding {
  position?: number | null;
  points?: number | null;
  played?: number | null;
}

export interface TeamBriefNewsItem {
  title: string;
  description?: string | null;
}

export interface TeamBriefRequest {
  teamId: string;
  teamName: string;
  lastMatch: TeamBriefMatch | null;
  nextMatch: TeamBriefMatch | null;
  standing: TeamBriefStanding | null;
  news: TeamBriefNewsItem[];
}

export interface TeamBriefResponse {
  summary: string | null;
  highlights: string[];
  cached: boolean;
  pending: boolean;
  generatedAt: string | null;
}

export const teamBriefQueryKey = (request: TeamBriefRequest) => ['ai-team-brief', request] as const;

function isTeamBriefResponse(value: unknown): value is TeamBriefResponse {
  if (typeof value !== 'object' || value === null) return false;
  const response = value as Partial<TeamBriefResponse>;
  return (typeof response.summary === 'string' || response.summary === null) &&
    Array.isArray(response.highlights) &&
    response.highlights.length <= 3 &&
    response.highlights.every((highlight) => typeof highlight === 'string') &&
    typeof response.cached === 'boolean' &&
    typeof response.pending === 'boolean' &&
    (typeof response.generatedAt === 'string' || response.generatedAt === null);
}

export async function generateTeamBrief(request: TeamBriefRequest): Promise<TeamBriefResponse> {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const client = supabase;
  const data = await withTransientRetry('team-brief', async () => {
    const { data: responseData, error } = await client.functions.invoke('ai-team-brief', {
      body: { ...request, generate: true },
    });
    if (error) throw error;
    return responseData;
  });
  if (!isTeamBriefResponse(data)) throw new Error('Respuesta de resumen del equipo inválida.');
  return data;
}
