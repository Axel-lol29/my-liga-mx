import { supabase } from '../../lib/supabase';
import { withTransientRetry } from './transientRetry';

export interface RoundSummaryMatch {
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: 'finished';
}

export interface RoundSummaryRequest {
  round: number;
  totalMatches: number;
  matches: RoundSummaryMatch[];
}

export type RoundSummaryHighlight = string;

export interface RoundSummaryResponse {
  round: number;
  summary: string | null;
  highlights: RoundSummaryHighlight[];
  isComplete: boolean;
  completedMatches: number;
  totalMatches: number;
  cached: boolean;
  pending: boolean;
  generatedAt: string | null;
}

function safeDiagnosticText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  return value
    .replace(/Bearer\s+[^\s"']+/gi, 'Bearer [REDACTED]')
    .replace(/AIza[\w-]{20,}/g, '[REDACTED_API_KEY]')
    .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+\b/g, '[REDACTED_TOKEN]')
    .slice(0, 500);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function logInvokeFailure(error: unknown): Promise<void> {
  if (!__DEV__) return;
  const errorRecord = isRecord(error) ? error : {};
  const context = errorRecord.context;
  let httpStatus: number | null = null;
  let body: unknown;
  if (context instanceof Response) {
    httpStatus = context.status;
    try { body = await context.clone().json(); } catch { body = undefined; }
  } else if (isRecord(context)) {
    httpStatus = typeof context.status === 'number' ? context.status : null;
    body = context.body;
  }

  const responseBody = isRecord(body) ? body : {};
  const provider = isRecord(responseBody.provider) ? responseBody.provider : {};
  console.warn('[round-summary] Edge Function invoke failed', {
    httpStatus,
    message: safeDiagnosticText(errorRecord.message),
    code: safeDiagnosticText(responseBody.code),
    responseError: safeDiagnosticText(responseBody.error),
    providerHttpStatus: typeof provider.httpStatus === 'number' ? provider.httpStatus : undefined,
    providerStatus: safeDiagnosticText(provider.status),
    providerMessage: safeDiagnosticText(responseBody.providerMessage) ?? safeDiagnosticText(provider.message),
  });
}

function isRoundSummaryResponse(value: unknown): value is RoundSummaryResponse {
  if (typeof value !== 'object' || value === null) return false;
  const response = value as Partial<RoundSummaryResponse>;
  return typeof response.round === 'number' &&
    (typeof response.summary === 'string' || response.summary === null) &&
    Array.isArray(response.highlights) &&
    typeof response.isComplete === 'boolean' &&
    typeof response.completedMatches === 'number' &&
    typeof response.totalMatches === 'number' &&
    typeof response.cached === 'boolean' &&
    typeof response.pending === 'boolean' &&
    (typeof response.generatedAt === 'string' || response.generatedAt === null);
}

export async function requestRoundSummary(
  input: RoundSummaryRequest,
  generate: boolean,
): Promise<RoundSummaryResponse> {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const client = supabase;
  const invoke = async (): Promise<unknown> => {
    const { data, error } = await client.functions.invoke('ai-round-summary', {
      body: { ...input, generate },
    });
    if (error) {
      await logInvokeFailure(error);
      throw error;
    }
    return data;
  };
  const data = await withTransientRetry('round-summary', invoke);
  if (__DEV__) console.info('[round-summary] Edge Function invoke succeeded', { httpStatus: 'success' });
  if (!isRoundSummaryResponse(data)) {
    if (__DEV__) console.warn('[round-summary] Edge Function returned an invalid response shape');
    throw new Error('Respuesta de resumen inválida.');
  }
  return data;
}
