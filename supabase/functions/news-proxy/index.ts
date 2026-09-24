const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };
const CACHE_TTL_MS = 10 * 60 * 1000;
const responseCache = new Map<string, { expiresAt: number; value: unknown }>();

type NewsRequest = {
  mode?: 'league' | 'team';
  teamName?: string;
  teamAliases?: string[];
  query?: string;
};

type GNewsArticle = {
  title?: unknown;
  description?: unknown;
  content?: unknown;
  image?: unknown;
  url?: unknown;
  publishedAt?: unknown;
  source?: { name?: unknown } | null;
};

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: jsonHeaders });
}

function buildSearchQuery(body: NewsRequest): string | null {
  if (body.mode === 'league') {
    return '("Liga MX" OR "fútbol mexicano" OR (Apertura AND "Liga MX") OR (Clausura AND "Liga MX")) AND NOT "Liga MX Femenil" AND NOT MLS AND NOT "Selección Mexicana"';
  }
  if (body.mode === 'team') {
    const teamName = typeof body.teamName === 'string' ? body.teamName.trim() : '';
    if (!teamName || teamName.length > 64) return null;
    const terms = [teamName, ...(Array.isArray(body.teamAliases) ? body.teamAliases : [])]
      .filter((term): term is string => typeof term === 'string')
      .map((term) => term.replace(/["\\]/g, '').replace(/\s+/g, ' ').trim())
      .filter((term) => term.length > 1 && term.length <= 64);
    const uniqueTerms = [...new Set(terms.map((term) => term.toLocaleLowerCase('es-MX')))]
      .map((lower) => terms.find((term) => term.toLocaleLowerCase('es-MX') === lower) as string)
      .slice(0, 6);
    const qualifier = ' AND ("Liga MX" OR "fútbol mexicano" OR fútbol)';
    while (uniqueTerms.length > 1 && `(${uniqueTerms.map((term) => `"${term}"`).join(' OR ')})${qualifier}`.length > 200) uniqueTerms.pop();
    return `(${uniqueTerms.map((term) => `"${term}"`).join(' OR ')})${qualifier}`;
  }
  if (body.mode !== undefined) return null;

  // Backward compatibility for Home and existing consumers that still send { query }.
  const legacyQuery = typeof body.query === 'string' ? body.query.trim() : 'Liga MX fútbol mexicano';
  return legacyQuery && legacyQuery.length <= 200 ? legacyQuery : null;
}

function normalizeArticles(input: unknown): { articles: Record<string, string | null>[]; totalArticles: number } {
  const response = input && typeof input === 'object' ? input as { articles?: unknown; totalArticles?: unknown } : {};
  const sourceArticles = Array.isArray(response.articles) ? response.articles as GNewsArticle[] : [];
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const articles = sourceArticles.flatMap((article) => {
    const title = typeof article.title === 'string' ? article.title.trim() : '';
    const url = typeof article.url === 'string' ? article.url.trim() : '';
    if (!title || !/^https?:\/\//i.test(url)) return [];
    const normalizedUrl = url.toLowerCase().replace(/\/$/, '');
    const normalizedTitle = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (seenUrls.has(normalizedUrl) || seenTitles.has(normalizedTitle)) return [];
    seenUrls.add(normalizedUrl);
    seenTitles.add(normalizedTitle);
    return [{
      id: url,
      title,
      description: typeof article.description === 'string' ? article.description : null,
      content: typeof article.content === 'string' ? article.content : null,
      image: typeof article.image === 'string' && /^https?:\/\//i.test(article.image) ? article.image : null,
      url,
      publishedAt: typeof article.publishedAt === 'string' ? article.publishedAt : null,
      sourceName: typeof article.source?.name === 'string' ? article.source.name : 'Fuente',
    }];
  }).sort((a, b) => (Date.parse(b.publishedAt ?? '') || 0) - (Date.parse(a.publishedAt ?? '') || 0));
  return { articles, totalArticles: typeof response.totalArticles === 'number' ? response.totalArticles : articles.length };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);

  let body: NewsRequest;
  try {
    body = await request.json() as NewsRequest;
  } catch {
    return json({ error: 'Solicitud inválida.' }, 400);
  }

  const query = buildSearchQuery(body);
  if (!query || query.length > 200) return json({ error: 'Consulta de noticias inválida.' }, 400);

  const cacheKey = query.toLocaleLowerCase('es-MX');
  const cached = responseCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return json(cached.value);
  if (cached) responseCache.delete(cacheKey);

  const apiKey = Deno.env.get('GNEWS_API_KEY')?.trim();
  if (!apiKey) {
    console.error('news-proxy: falta el secret server-side GNEWS_API_KEY.');
    return json({ error: 'El proveedor de noticias no está configurado.' }, 503);
  }

  try {
    const url = new URL('https://gnews.io/api/v4/search');
    url.searchParams.set('q', query);
    url.searchParams.set('lang', 'es');
    url.searchParams.set('country', 'mx');
    url.searchParams.set('max', '10');
    url.searchParams.set('sortby', 'publishedAt');
    url.searchParams.set('apikey', apiKey);
    const response = await fetch(url);
    const text = await response.text();

    if (!response.ok) {
      console.error('news-proxy upstream GNews error:', {
        status: response.status,
        response: text.slice(0, 800).replaceAll(apiKey, '[redacted]'),
      });
      return json({ error: 'El proveedor de noticias no pudo completar la búsqueda.' }, 502);
    }

    let upstreamData: unknown;
    try {
      upstreamData = JSON.parse(text);
    } catch {
      console.error('news-proxy: GNews respondió con JSON inválido.');
      return json({ error: 'El proveedor de noticias respondió de forma inesperada.' }, 502);
    }

    const normalized = normalizeArticles(upstreamData);
    responseCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, value: normalized });
    return json(normalized);
  } catch (error) {
    console.error('news-proxy request failed:', error);
    return json({ error: 'No pudimos conectar con el proveedor de noticias.' }, 502);
  }
});
