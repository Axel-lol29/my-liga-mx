import { supabase } from '../../lib/supabase';
import { withTransientRetry } from './transientRetry';

export type RecapTimelineType = 'goal' | 'yellow_card' | 'red_card' | 'substitution' | 'var' | 'unknown';

export interface RecapTimelineEvent {
  minute: number | null;
  extraMinute?: number | null;
  type: RecapTimelineType;
  team: string | null;
  player: string | null;
  assist: string | null;
  detail: string | null;
}

export interface RecapStatistic {
  name: string;
  home: string | number | null;
  away: string | number | null;
}

export interface RecapLineupPlayer {
  name: string;
  position: string | null;
  number: string | number | null;
  role: 'starter' | 'substitute' | null;
}

export interface MatchRecapRequest {
  match: {
    eventId: string;
    status: 'finished';
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    localDateTime: string | null;
    venue: string | null;
  };
  timeline: RecapTimelineEvent[];
  statistics: RecapStatistic[];
  lineups: { home: RecapLineupPlayer[]; away: RecapLineupPlayer[] };
}

export interface MatchRecapResponse {
  summary: string | null;
  highlights: string[];
  cached: boolean;
  pending: boolean;
  generatedAt: string | null;
}

export const matchRecapQueryKey = (request: MatchRecapRequest) => ['ai-match-recap', request] as const;

function isMatchRecapResponse(value: unknown): value is MatchRecapResponse {
  if (typeof value !== 'object' || value === null) return false;
  const response = value as Partial<MatchRecapResponse>;
  return (typeof response.summary === 'string' || response.summary === null) &&
    Array.isArray(response.highlights) &&
    response.highlights.length <= 3 &&
    response.highlights.every((highlight) => typeof highlight === 'string') &&
    typeof response.cached === 'boolean' &&
    typeof response.pending === 'boolean' &&
    (typeof response.generatedAt === 'string' || response.generatedAt === null);
}

export async function generateMatchRecap(request: MatchRecapRequest): Promise<MatchRecapResponse> {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const client = supabase;
  const data = await withTransientRetry('match-recap', async () => {
    const { data: responseData, error } = await client.functions.invoke('ai-match-recap', {
      body: { ...request, generate: true },
    });
    if (error) throw error;
    return responseData;
  });
  if (!isMatchRecapResponse(data)) throw new Error('Respuesta de resumen del partido inválida.');
  return data;
}
