const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const responseHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };
const LEAGUE_ID = '4350';
const SEASON = '2026-2027';
const DEFAULT_MODEL = 'gemini-3.1-flash-lite';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_ROUND = 20;
const MAX_MATCHES = 20;
const CLAIM_STALE_AFTER_MS = 5 * 60 * 1000;

type FinishedMatchInput = {
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: 'finished';
};
type RoundRequest = {
  round: number;
  totalMatches: number;
  matches: FinishedMatchInput[];
  generate: boolean;
};
type CacheRow = {
  summary: string | null;
  highlights: unknown;
  is_complete: boolean;
  completed_matches: number;
  total_matches: number;
  generation_status: 'generating' | 'ready' | 'failed';
  generation_token: string | null;
  updated_at: string;
};
type GeneratedSummary = { summary: string; highlights: string[] };
type GeminiErrorCategory = 'quota' | 'configuration' | 'upstream';
class GeminiProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly providerStatus: string | undefined,
    readonly category: GeminiErrorCategory,
    readonly providerMessage?: string,
  ) {
    super(message);
    this.name = 'GeminiProviderError';
  }
}

type SummaryErrorCode =
  | 'AUTH_ERROR'
  | 'INVALID_PAYLOAD'
  | 'CACHE_READ_ERROR'
  | 'GEMINI_KEY_MISSING'
  | 'GEMINI_HTTP_ERROR'
  | 'GEMINI_QUOTA'
  | 'GEMINI_INVALID_RESPONSE'
  | 'CACHE_WRITE_ERROR'
  | 'UNKNOWN_ERROR';

class SummaryError extends Error {
  constructor(readonly code: SummaryErrorCode, message: string, readonly status: number) {
    super(message);
    this.name = 'SummaryError';
  }
}

function logStage(stage: string, details: Record<string, unknown> = {}): void {
  console.info(`[ai-round-summary] ${stage}`, details);
}

function errorJson(code: SummaryErrorCode, message: string, status: number, details: Record<string, unknown> = {}): Response {
  logStage('response_to_client', { status, errorCode: code });
  return json({ error: message, code, ...details }, status);
}

function safeProviderMessage(value: string): string {
  return value
    .replace(/Bearer\s+[^\s"']+/gi, 'Bearer [REDACTED]')
    .replace(/AIza[\w-]{20,}/g, '[REDACTED_API_KEY]')
    .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+\b/g, '[REDACTED_TOKEN]');
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validScore(value: unknown): value is number | null {
  return value === null || (Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 99);
}

function parseRequest(value: unknown): RoundRequest | null {
  if (!isObject(value)) return null;
  const round = value.round;
  const totalMatches = value.totalMatches;
  const rawMatches = value.matches;
  const generate = value.generate === true;
  if (!Number.isInteger(round) || (round as number) < 1 || (round as number) > MAX_ROUND) return null;
  if (!Number.isInteger(totalMatches) || (totalMatches as number) < 1 || (totalMatches as number) > MAX_MATCHES) return null;
  if (!Array.isArray(rawMatches) || rawMatches.length < 1 || rawMatches.length > MAX_MATCHES || rawMatches.length > (totalMatches as number)) return null;

  const matches: FinishedMatchInput[] = [];
  for (const raw of rawMatches) {
    if (!isObject(raw)) return null;
    const homeTeam = typeof raw.homeTeam === 'string' ? raw.homeTeam.trim() : '';
    const awayTeam = typeof raw.awayTeam === 'string' ? raw.awayTeam.trim() : '';
    if (!homeTeam || !awayTeam || homeTeam.length > 80 || awayTeam.length > 80) return null;
    if (!validScore(raw.homeScore) || !validScore(raw.awayScore) || raw.status !== 'finished') return null;
    matches.push({ homeTeam, awayTeam, homeScore: raw.homeScore, awayScore: raw.awayScore, status: 'finished' });
  }

  return { round: round as number, totalMatches: totalMatches as number, matches, generate };
}

function canonicalMatches(matches: FinishedMatchInput[]): FinishedMatchInput[] {
  return [...matches].sort((a, b) =>
    a.homeTeam.localeCompare(b.homeTeam, 'es') ||
    a.awayTeam.localeCompare(b.awayTeam, 'es') ||
    (a.homeScore ?? -1) - (b.homeScore ?? -1) ||
    (a.awayScore ?? -1) - (b.awayScore ?? -1),
  );
}

async function hashData(data: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function cacheResponse(round: number, row: CacheRow, cached: boolean): Record<string, unknown> {
  return {
    round,
    summary: row.generation_status === 'ready' ? row.summary : null,
    highlights: row.generation_status === 'ready' && Array.isArray(row.highlights) ? row.highlights : [],
    isComplete: row.is_complete,
    completedMatches: row.completed_matches,
    totalMatches: row.total_matches,
    cached,
    pending: row.generation_status === 'generating',
    generatedAt: row.generation_status === 'ready' ? row.updated_at : null,
  };
}

function cacheUrl(baseUrl: string, round: number, dataHash: string): URL {
  const url = new URL(`${baseUrl.replace(/\/$/, '')}/rest/v1/ai_round_summaries`);
  url.searchParams.set('select', 'summary,highlights,is_complete,completed_matches,total_matches,generation_status,generation_token,updated_at');
  url.searchParams.set('league_id', `eq.${LEAGUE_ID}`);
  url.searchParams.set('season', `eq.${SEASON}`);
  url.searchParams.set('round', `eq.${round}`);
  url.searchParams.set('data_hash', `eq.${dataHash}`);
  return url;
}

function cacheHeaders(serviceKey: string, prefer?: string): HeadersInit {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

async function readCache(baseUrl: string, serviceKey: string, round: number, dataHash: string): Promise<CacheRow | null> {
  const url = cacheUrl(baseUrl, round, dataHash);
  const response = await fetch(url, { headers: cacheHeaders(serviceKey) });
  if (!response.ok) throw new Error(`Cache read failed (${response.status}).`);
  const rows: unknown = await response.json();
  return Array.isArray(rows) && isObject(rows[0]) ? rows[0] as unknown as CacheRow : null;
}

async function claimCache(
  baseUrl: string,
  serviceKey: string,
  request: RoundRequest,
  dataHash: string,
  isComplete: boolean,
): Promise<{ row: CacheRow | null; acquired: boolean }> {
  const endpoint = `${baseUrl.replace(/\/$/, '')}/rest/v1/ai_round_summaries`;
  const now = new Date().toISOString();
  const generationToken = crypto.randomUUID();
  const payload = {
    league_id: LEAGUE_ID,
    season: SEASON,
    round: request.round,
    data_hash: dataHash,
    summary: null,
    highlights: [],
    is_complete: isComplete,
    completed_matches: request.matches.length,
    total_matches: request.totalMatches,
    generation_status: 'generating',
    generation_token: generationToken,
    updated_at: now,
  };
  const insertUrl = new URL(endpoint);
  insertUrl.searchParams.set('on_conflict', 'league_id,season,round,data_hash');
  insertUrl.searchParams.set('select', 'summary,highlights,is_complete,completed_matches,total_matches,generation_status,generation_token,updated_at');
  const inserted = await fetch(insertUrl, {
    method: 'POST',
    headers: cacheHeaders(serviceKey, 'resolution=ignore-duplicates,return=representation'),
    body: JSON.stringify(payload),
  });
  if (!inserted.ok) throw new Error(`Cache claim failed (${inserted.status}).`);
  const insertedRows: unknown = await inserted.json();
  if (Array.isArray(insertedRows) && isObject(insertedRows[0])) return { row: insertedRows[0] as unknown as CacheRow, acquired: true };

  const existing = await readCache(baseUrl, serviceKey, request.round, dataHash);
  if (!existing || existing.generation_status === 'ready') return { row: existing, acquired: false };
  if (existing.generation_status === 'generating' && Date.now() - Date.parse(existing.updated_at) < CLAIM_STALE_AFTER_MS) {
    return { row: existing, acquired: false };
  }

  const patchUrl = cacheUrl(baseUrl, request.round, dataHash);
  patchUrl.searchParams.set('generation_status', `eq.${existing.generation_status}`);
  if (existing.generation_status === 'generating') {
    patchUrl.searchParams.set('updated_at', `lt.${new Date(Date.now() - CLAIM_STALE_AFTER_MS).toISOString()}`);
  }
  patchUrl.searchParams.delete('select');
  patchUrl.searchParams.set('select', 'summary,highlights,is_complete,completed_matches,total_matches,generation_status,generation_token,updated_at');
  const claimed = await fetch(patchUrl, {
    method: 'PATCH',
    headers: cacheHeaders(serviceKey, 'return=representation'),
    body: JSON.stringify(payload),
  });
  if (!claimed.ok) throw new Error(`Cache reclaim failed (${claimed.status}).`);
  const claimedRows: unknown = await claimed.json();
  if (Array.isArray(claimedRows) && isObject(claimedRows[0])) return { row: claimedRows[0] as unknown as CacheRow, acquired: true };
  return { row: await readCache(baseUrl, serviceKey, request.round, dataHash), acquired: false };
}

async function updateCache(
  baseUrl: string,
  serviceKey: string,
  round: number,
  dataHash: string,
  generationToken: string,
  update: Record<string, unknown>,
): Promise<void> {
  const url = cacheUrl(baseUrl, round, dataHash);
  url.searchParams.set('generation_status', 'eq.generating');
  url.searchParams.set('generation_token', `eq.${generationToken}`);
  url.searchParams.delete('select');
  const response = await fetch(url, {
    method: 'PATCH',
    headers: cacheHeaders(serviceKey, 'return=representation'),
    body: JSON.stringify({ ...update, updated_at: new Date().toISOString() }),
  });
  if (!response.ok) throw new Error(`Cache update failed (${response.status}).`);
  const rows: unknown = await response.json();
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('Generation claim expired before persistence.');
}

async function validateSignedInUser(request: Request): Promise<boolean> {
  const authorization = request.headers.get('Authorization') ?? '';
  const token = authorization.match(/^Bearer\s+([\w.-]+)$/i)?.[1];
  if (!token || token.split('.').length !== 3) return false;
  const projectUrl = Deno.env.get('SUPABASE_URL')?.trim();
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
  if (!projectUrl || !serviceKey) throw new Error('Supabase auth configuration is missing.');
  const response = await fetch(`${projectUrl.replace(/\/$/, '')}/auth/v1/user`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return false;
  const user: unknown = await response.json();
  return isObject(user) && typeof user.id === 'string';
}

const SYSTEM_PROMPT = `Eres redactor deportivo de Liga MX. Escribe en español natural, sobrio y breve. Usa exclusivamente la jornada y los partidos finalizados incluidos en los datos del usuario. Solo puedes afirmar nombres de equipos, marcadores, victorias, derrotas, empates y cantidades de goles que se deduzcan directamente de esos marcadores. No infieras ni menciones goleadores, lesiones, tarjetas, posesión, oportunidades, dominio, polémicas, remontadas, rendimiento histórico, cambios en la tabla ni contexto externo. No inventes partidos o hechos. Si hay pocos partidos, resume solo lo que permiten afirmar. El campo summary debe tener como máximo 120 palabras. Devuelve de 0 a 3 highlights, cada uno estrictamente factual y basado en un resultado enviado.`;

const ROUND_SUMMARY_SCHEMA = {
  type: 'OBJECT',
  properties: {
    summary: { type: 'STRING' },
    highlights: {
      type: 'ARRAY',
      items: { type: 'STRING' },
    },
  },
  required: ['summary', 'highlights'],
};

async function generateWithGemini(data: unknown, apiKey: string, model: string): Promise<GeneratedSummary> {
  const response = await fetch(`${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(30_000),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: JSON.stringify(data) }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: ROUND_SUMMARY_SCHEMA,
        maxOutputTokens: 600,
        temperature: 0.2,
      },
    }),
  });
  const responseText = await response.text();
  logStage('gemini_http_response', { model, status: response.status });
  if (!response.ok) {
    let providerStatus: string | undefined;
    let providerMessage = '';
    try {
      const errorPayload: unknown = JSON.parse(responseText);
      if (isObject(errorPayload) && isObject(errorPayload.error)) {
        if (typeof errorPayload.error.status === 'string') providerStatus = errorPayload.error.status;
        if (typeof errorPayload.error.message === 'string') providerMessage = errorPayload.error.message;
      }
    } catch {
      // Do not log the raw provider response or request headers; they can contain sensitive details.
    }
    providerMessage = safeProviderMessage(providerMessage);
    console.warn('[ai-round-summary] Gemini provider error', { model, status: response.status, providerStatus, providerMessage });
    const isQuotaError = response.status === 429 || providerStatus === 'RESOURCE_EXHAUSTED';
    const isConfigurationError = response.status === 401 || response.status === 403 || /api.?key.{0,30}(invalid|not valid)/i.test(providerMessage);
    const message = response.status === 404
      ? `Gemini model not found: ${model}.`
      : isConfigurationError
        ? 'Gemini rejected the server API key.'
        : isQuotaError
          ? 'Gemini free-tier quota was reached.'
          : `Gemini returned HTTP ${response.status}.`;
    throw new GeminiProviderError(
      message,
      response.status,
      providerStatus,
      isQuotaError ? 'quota' : isConfigurationError ? 'configuration' : 'upstream',
      providerMessage || undefined,
    );
  }

  logStage('gemini_response_parsing_started', { model, status: response.status });
  let payload: unknown;
  try { payload = JSON.parse(responseText); } catch { throw new SummaryError('GEMINI_INVALID_RESPONSE', 'Gemini response was not valid JSON.', 502); }
  if (!isObject(payload) || !Array.isArray(payload.candidates)) throw new SummaryError('GEMINI_INVALID_RESPONSE', 'Gemini response did not contain candidates.', 502);
  const candidate = payload.candidates[0];
  if (!isObject(candidate) || !isObject(candidate.content) || !Array.isArray(candidate.content.parts)) {
    throw new SummaryError('GEMINI_INVALID_RESPONSE', 'Gemini response did not contain candidate content.', 502);
  }
  const outputText = candidate.content.parts.flatMap((part) =>
    isObject(part) && typeof part.text === 'string' ? [part.text] : [],
  ).join('');
  if (!outputText) throw new SummaryError('GEMINI_INVALID_RESPONSE', 'Gemini response did not contain structured text.', 502);

  let generated: unknown;
  try { generated = JSON.parse(outputText); } catch { throw new SummaryError('GEMINI_INVALID_RESPONSE', 'Gemini structured output was invalid.', 502); }
  if (!isObject(generated) || typeof generated.summary !== 'string' || !Array.isArray(generated.highlights)) {
    throw new SummaryError('GEMINI_INVALID_RESPONSE', 'Gemini structured output did not match the expected shape.', 502);
  }
  const summary = generated.summary.trim();
  const words = summary ? summary.split(/\s+/).length : 0;
  const highlights = generated.highlights;
  if (!summary || words > 120 || highlights.some((item) => typeof item !== 'string' || !item.trim())) {
    throw new SummaryError('GEMINI_INVALID_RESPONSE', 'Gemini output exceeded the allowed summary limits.', 502);
  }
  const normalizedHighlights = highlights.slice(0, 3).map((item) => (item as string).trim());
  logStage('gemini_response_parsed', { model, summaryWords: words, highlightsCount: normalizedHighlights.length });
  return { summary, highlights: normalizedHighlights };
}

Deno.serve(async (request) => {
  logStage('request_received', { method: request.method });
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return errorJson('INVALID_PAYLOAD', 'Método no permitido.', 405);

  logStage('auth_validation_started');
  try {
    if (!await validateSignedInUser(request)) {
      logStage('auth_invalid');
      return errorJson('AUTH_ERROR', 'Se requiere una sesión autenticada.', 401);
    }
    logStage('auth_valid');
  } catch (error) {
    console.error('[ai-round-summary] auth validation failed', { message: error instanceof Error ? error.message : 'unknown error' });
    return errorJson('AUTH_ERROR', 'No pudimos validar la sesión.', 503);
  }

  let rawBody: unknown;
  try {
    const bodyText = await request.text();
    if (new TextEncoder().encode(bodyText).byteLength > 16_384) {
      return errorJson('INVALID_PAYLOAD', 'La solicitud excede el tamaño permitido.', 413);
    }
    rawBody = JSON.parse(bodyText);
  } catch {
    return errorJson('INVALID_PAYLOAD', 'Solicitud inválida.', 400);
  }
  const input = parseRequest(rawBody);
  if (!input) return errorJson('INVALID_PAYLOAD', 'Datos de jornada inválidos.', 400);
  logStage('payload_validated', { round: input.round, matchCount: input.matches.length, generate: input.generate });

  const matches = canonicalMatches(input.matches);
  const isComplete = matches.length === input.totalMatches;
  const hashPayload = {
    leagueId: LEAGUE_ID,
    season: SEASON,
    round: input.round,
    totalMatches: input.totalMatches,
    matches,
  };
  const dataHash = await hashData(hashPayload);

  const projectUrl = Deno.env.get('SUPABASE_URL')?.trim();
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
  if (!projectUrl || !serviceKey) {
    console.error('[ai-round-summary] cache configuration missing');
    return errorJson('CACHE_READ_ERROR', 'No pudimos consultar el caché del resumen.', 503);
  }

  let cacheRow: CacheRow | null;
  let generationToken: string | null = null;
  let stage: 'cache_read' | 'cache_write' | 'gemini' = 'cache_read';
  try {
    logStage('cache_consulted', { round: input.round });
    cacheRow = await readCache(projectUrl, serviceKey, input.round, dataHash);
    logStage(cacheRow ? 'cache_hit' : 'cache_miss', { round: input.round, ready: cacheRow?.generation_status === 'ready' });
    if (cacheRow?.generation_status === 'ready') {
      logStage('response_to_client', { status: 200, cached: true });
      return json(cacheResponse(input.round, cacheRow, true));
    }
    if (!input.generate) {
      const body = cacheRow ? cacheResponse(input.round, cacheRow, false) : {
        round: input.round,
        summary: null,
        highlights: [],
        isComplete,
        completedMatches: matches.length,
        totalMatches: input.totalMatches,
        cached: false,
        pending: false,
        generatedAt: null,
      };
      logStage('response_to_client', { status: 200, cached: Boolean(cacheRow), pending: Boolean(cacheRow?.generation_status === 'generating') });
      return json(body);
    }

    stage = 'cache_write';
    logStage('cache_claim_started', { round: input.round });
    const claim = await claimCache(projectUrl, serviceKey, input, dataHash, isComplete);
    cacheRow = claim.row;
    if (!cacheRow) throw new SummaryError('CACHE_WRITE_ERROR', 'No pudimos reservar la generación.', 503);
    if (cacheRow.generation_status === 'ready') {
      logStage('cache_hit_after_claim', { round: input.round });
      logStage('response_to_client', { status: 200, cached: true });
      return json(cacheResponse(input.round, cacheRow, true));
    }
    if (!claim.acquired) {
      logStage('generation_already_in_progress', { round: input.round });
      logStage('response_to_client', { status: 200, pending: true });
      return json(cacheResponse(input.round, cacheRow, false));
    }
    generationToken = cacheRow.generation_token;
    if (!generationToken) throw new SummaryError('CACHE_WRITE_ERROR', 'Generation claim did not include a token.', 503);

    const apiKey = Deno.env.get('GEMINI_API_KEY')?.trim();
    if (!apiKey) {
      console.error('[ai-round-summary] GEMINI_API_KEY is missing');
      throw new SummaryError('GEMINI_KEY_MISSING', 'El proveedor de IA no está configurado correctamente.', 503);
    }
    logStage('gemini_key_present', { model: DEFAULT_MODEL });
    stage = 'gemini';
    logStage('gemini_request_started', { model: DEFAULT_MODEL, round: input.round });
    const generated = await generateWithGemini(hashPayload, apiKey, DEFAULT_MODEL);

    stage = 'cache_write';
    logStage('cache_write_started', { round: input.round });
    await updateCache(projectUrl, serviceKey, input.round, dataHash, generationToken, {
      summary: generated.summary,
      highlights: generated.highlights,
      generation_status: 'ready',
      is_complete: isComplete,
      completed_matches: matches.length,
      total_matches: input.totalMatches,
    });
    logStage('cache_write_completed', { round: input.round });
    stage = 'cache_read';
    const saved = await readCache(projectUrl, serviceKey, input.round, dataHash);
    if (!saved) throw new SummaryError('CACHE_READ_ERROR', 'Generated summary was not found after persistence.', 503);
    logStage('response_to_client', { status: 200, cached: false });
    return json(cacheResponse(input.round, saved, false));
  } catch (error) {
    let code: SummaryErrorCode = 'UNKNOWN_ERROR';
    let status = 500;
    let clientMessage = 'No pudimos generar el resumen en este momento.';
    const details: Record<string, unknown> = {};

    if (error instanceof GeminiProviderError) {
      status = error.category === 'quota' ? 429 : error.category === 'configuration' ? 503 : 502;
      code = error.category === 'quota' ? 'GEMINI_QUOTA' : 'GEMINI_HTTP_ERROR';
      clientMessage = error.category === 'quota'
        ? 'No pudimos generar el resumen en este momento. Intenta de nuevo más tarde.'
        : error.category === 'configuration'
          ? 'El proveedor de IA no está configurado correctamente.'
          : 'Gemini no pudo generar el resumen.';
      details.provider = {
        model: DEFAULT_MODEL,
        httpStatus: error.status,
        status: error.providerStatus ?? null,
        message: error.providerMessage ?? error.message,
      };
    } else if (error instanceof SummaryError) {
      code = error.code;
      status = error.status;
      clientMessage = error.message;
    } else if (stage === 'cache_read') {
      code = 'CACHE_READ_ERROR';
      status = 503;
      clientMessage = 'No pudimos consultar el caché del resumen.';
    } else if (stage === 'cache_write') {
      code = 'CACHE_WRITE_ERROR';
      status = 503;
      clientMessage = 'No pudimos guardar el resumen.';
    }

    const safeMessage = error instanceof Error ? safeProviderMessage(error.message) : 'unknown error';
    console.error('[ai-round-summary] request failed', { stage, code, status, message: safeMessage });
    if (generationToken && stage !== 'cache_read') {
      try {
        await updateCache(projectUrl, serviceKey, input.round, dataHash, generationToken, { generation_status: 'failed', summary: null, highlights: [] });
        logStage('cache_generation_marked_failed', { round: input.round });
      } catch (cacheError) {
        console.error('[ai-round-summary] failed to mark cache claim', {
          message: cacheError instanceof Error ? safeProviderMessage(cacheError.message) : 'unknown error',
        });
      }
    }
    if (error instanceof GeminiProviderError && error.category === 'upstream' && error.providerMessage) {
      details.providerMessage = error.providerMessage;
    }
    logStage('response_to_client', { status, errorCode: code });
    return json({ error: clientMessage, code, ...details }, status);
  }
});
