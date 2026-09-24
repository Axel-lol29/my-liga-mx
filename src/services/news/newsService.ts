import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { NewsArticle } from '../../types';

export type NewsQuery =
  | { mode: 'league' }
  | { mode: 'team'; teamName: string; teamAliases?: readonly string[] };

type NewsRequest = string | NewsQuery;

function getRecoverableStatus(error: unknown): number | null {
  if (error instanceof FunctionsFetchError || error instanceof FunctionsRelayError) return 0;
  if (!(error instanceof FunctionsHttpError)) return null;
  const context = error.context;
  if (context instanceof Response) return context.status;
  if (context && typeof context === 'object' && 'status' in context && typeof context.status === 'number') return context.status;
  return null;
}

export async function getNews(request?: NewsRequest): Promise<NewsArticle[]> {
  if (!supabase) throw new Error('No pudimos cargar las noticias.');
  const body = typeof request === 'string' ? { query: request } : request ?? { mode: 'league' as const };
  const { data, error } = await supabase.functions.invoke('news-proxy', { body });
  if (error) {
    const status = getRecoverableStatus(error);
    if (status === 0 || status === 429 || status === 502 || status === 503) {
      console.warn('news-proxy temporary request failure:', { status: status || 'network', message: error.message });
    } else {
      console.error('news-proxy unexpected request failure:', error);
    }
    throw new Error('No pudimos cargar las noticias.');
  }
  if (!data || typeof data !== 'object') {
    console.error('news-proxy returned an invalid response:', data);
    throw new Error('No pudimos cargar las noticias.');
  }

  const rawArticles = (data as { articles?: unknown }).articles;
  if (!Array.isArray(rawArticles)) return [];

  const articles: NewsArticle[] = rawArticles.flatMap((raw) => {
    if (!raw || typeof raw !== 'object') return [];
    const item = raw as Record<string, unknown>;
    const source = item.source && typeof item.source === 'object' ? item.source as Record<string, unknown> : null;
    const title = typeof item.title === 'string' ? item.title.trim() : '';
    const url = typeof item.url === 'string' ? item.url.trim() : '';
    if (!title || !/^https?:\/\//i.test(url)) return [];
    const sourceName = typeof item.sourceName === 'string'
      ? item.sourceName
      : typeof source?.name === 'string' ? source.name : 'Fuente';
    return [{
      id: typeof item.id === 'string' && item.id ? item.id : url,
      title,
      description: typeof item.description === 'string' ? item.description : null,
      image: typeof item.image === 'string' && /^https?:\/\//i.test(item.image) ? item.image : null,
      sourceName,
      publishedAt: typeof item.publishedAt === 'string' ? item.publishedAt : '',
      url,
      content: typeof item.content === 'string' ? item.content : null,
    }];
  });

  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  return articles
    .sort((a, b) => (Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0))
    .filter((article) => {
      const normalizedUrl = article.url.toLowerCase().replace(/\/$/, '');
      const normalizedTitle = article.title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      if (seenUrls.has(normalizedUrl) || seenTitles.has(normalizedTitle)) return false;
      seenUrls.add(normalizedUrl);
      seenTitles.add(normalizedTitle);
      return true;
    });
}
