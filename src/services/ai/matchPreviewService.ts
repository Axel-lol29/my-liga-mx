import { supabase } from '../../lib/supabase';
import { withTransientRetry } from './transientRetry';

export interface PreviewMatchSnapshot {
  eventId: string;
  homeTeam: string;
  awayTeam: string;
  localDateTime: string | null;
  venue: string | null;
}

export interface PreviewLastMatch {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  localDateTime: string | null;
}

export interface PreviewStanding {
  position: number;
  points: number;
  played: number;
}

export interface PreviewTeamContext {
  standing: PreviewStanding | null;
  lastMatch: PreviewLastMatch | null;
}

export interface MatchPreviewRequest {
  match: PreviewMatchSnapshot;
  homeTeamContext: PreviewTeamContext;
  awayTeamContext: PreviewTeamContext;
}

export interface MatchPreviewResponse {
  summary: string | null;
  highlights: string[];
  cached: boolean;
  pending: boolean;
  generatedAt: string | null;
}

export const matchPreviewQueryKey = (request: MatchPreviewRequest) => ['ai-match-preview', request] as const;

function isMatchPreviewResponse(value: unknown): value is MatchPreviewResponse {
  if (typeof value !== 'object' || value === null) return false;
  const response = value as Partial<MatchPreviewResponse>;
  return (typeof response.summary === 'string' || response.summary === null) &&
    Array.isArray(response.highlights) &&
    response.highlights.length <= 3 &&
    response.highlights.every((highlight) => typeof highlight === 'string') &&
    typeof response.cached === 'boolean' &&
    typeof response.pending === 'boolean' &&
    (typeof response.generatedAt === 'string' || response.generatedAt === null);
}

export async function generateMatchPreview(request: MatchPreviewRequest): Promise<MatchPreviewResponse> {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const client = supabase;
  const data = await withTransientRetry('match-preview', async () => {
    const { data: responseData, error } = await client.functions.invoke('ai-match-preview', {
      body: { ...request, generate: true },
    });
    if (error) throw error;
    return responseData;
  });
  if (!isMatchPreviewResponse(data)) throw new Error('Respuesta de previa de partido inválida.');
  return data;
}
