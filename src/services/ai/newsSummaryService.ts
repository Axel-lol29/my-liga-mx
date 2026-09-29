import { supabase } from '../../lib/supabase';
import { NewsArticle } from '../../types';
import { withTransientRetry } from './transientRetry';

export type NewsSummaryArticle = Pick<NewsArticle, 'title' | 'description' | 'content' | 'sourceName' | 'publishedAt' | 'url'>;

export interface NewsSummaryResponse {
  summary: string | null;
  highlights: string[];
  cached: boolean;
  pending: boolean;
  generatedAt: string | null;
}

function normalized(value: string | null): string {
  return (value ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim();
}

function normalizedUrl(value: string): string {
  try {
    const url = new URL(value.trim());
    url.hash = '';
    return url.toString();
  } catch {
    return normalized(value);
  }
}

export function newsSummaryQueryKey(article: NewsSummaryArticle): readonly unknown[] {
  return [
    'ai-news-summary',
    normalizedUrl(article.url),
    normalized(article.title),
    normalized(article.description),
    normalized(article.content),
  ] as const;
}

function isNewsSummaryResponse(value: unknown): value is NewsSummaryResponse {
  if (typeof value !== 'object' || value === null) return false;
  const response = value as Partial<NewsSummaryResponse>;
  return (typeof response.summary === 'string' || response.summary === null) &&
    Array.isArray(response.highlights) &&
    response.highlights.length <= 3 &&
    response.highlights.every((highlight) => typeof highlight === 'string') &&
    typeof response.cached === 'boolean' &&
    typeof response.pending === 'boolean' &&
    (typeof response.generatedAt === 'string' || response.generatedAt === null);
}

export async function requestNewsSummary(article: NewsSummaryArticle): Promise<NewsSummaryResponse> {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const client = supabase;
  const data = await withTransientRetry('news-summary', async () => {
    const { data: responseData, error } = await client.functions.invoke('ai-news-summary', {
      body: {
        article: {
          title: article.title,
          description: article.description,
          content: article.content,
          source: article.sourceName,
          publishedAt: article.publishedAt,
          url: article.url,
        },
        generate: true,
      },
    });
    if (error) throw error;
    return responseData;
  });
  if (!isNewsSummaryResponse(data)) throw new Error('Respuesta de resumen de noticia inválida.');
  return data;
}
