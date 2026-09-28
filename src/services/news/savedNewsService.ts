import { supabase } from '../../lib/supabase';
import { NewsArticle } from '../../types';

export interface SavedNewsArticle extends NewsArticle {
  createdAt: string;
}

interface SavedNewsRow {
  article_url: string;
  title: string;
  description: string | null;
  image_url: string | null;
  source_name: string | null;
  published_at: string | null;
  created_at: string;
}

async function getAuthenticatedUserId(): Promise<string> {
  const client = supabase;
  if (!client) throw new Error('Supabase aún no está configurado.');
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Inicia sesión para guardar noticias.');
  return data.user.id;
}

function mapSavedNews(row: SavedNewsRow): SavedNewsArticle {
  return {
    id: row.article_url,
    title: row.title,
    description: row.description,
    image: row.image_url,
    sourceName: row.source_name ?? 'Fuente',
    publishedAt: row.published_at ?? '',
    url: row.article_url,
    content: null,
    createdAt: row.created_at,
  };
}

export async function getSavedNews(): Promise<SavedNewsArticle[]> {
  const client = supabase;
  if (!client) throw new Error('Supabase aún no está configurado.');
  const userId = await getAuthenticatedUserId();
  const { data, error } = await client
    .from('saved_news')
    .select('article_url,title,description,image_url,source_name,published_at,created_at')
    .eq('user_id', userId)
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as SavedNewsRow[]).map(mapSavedNews);
}

export async function isNewsSaved(articleUrl: string): Promise<boolean> {
  const client = supabase;
  if (!client) throw new Error('Supabase aún no está configurado.');
  const userId = await getAuthenticatedUserId();
  const { data, error } = await client
    .from('saved_news')
    .select('id')
    .eq('user_id', userId)
    .eq('article_url', articleUrl)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function saveNews(article: NewsArticle): Promise<void> {
  const client = supabase;
  if (!client) throw new Error('Supabase aún no está configurado.');
  const userId = await getAuthenticatedUserId();
  const publishedAt = article.publishedAt && Number.isFinite(Date.parse(article.publishedAt))
    ? article.publishedAt
    : null;
  const { error } = await client.from('saved_news').insert({
    user_id: userId,
    article_url: article.url,
    title: article.title,
    description: article.description,
    image_url: article.image,
    source_name: article.sourceName,
    published_at: publishedAt,
  });
  // The unique constraint is the final guard against repeated taps/races.
  if (error && error.code !== '23505') throw error;
}

export async function removeSavedNews(articleUrl: string): Promise<void> {
  const client = supabase;
  if (!client) throw new Error('Supabase aún no está configurado.');
  const userId = await getAuthenticatedUserId();
  const { error } = await client
    .from('saved_news')
    .delete()
    .eq('user_id', userId)
    .eq('article_url', articleUrl);
  if (error) throw error;
}
