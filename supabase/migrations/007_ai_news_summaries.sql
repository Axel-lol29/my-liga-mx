create table if not exists public.ai_news_summaries (
  id uuid primary key default gen_random_uuid(),
  article_url text not null,
  content_hash text not null check (length(content_hash) = 64),
  summary text,
  highlights jsonb not null default '[]'::jsonb
    check (jsonb_typeof(highlights) = 'array'),
  generation_status text not null default 'generating'
    check (generation_status in ('generating', 'ready', 'failed')),
  generation_token uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_news_summaries_ready_payload_check
    check (generation_status <> 'ready' or summary is not null),
  constraint ai_news_summaries_cache_key_unique
    unique (article_url, content_hash)
);

alter table public.ai_news_summaries enable row level security;

-- The cache is accessed only by the authenticated Edge Function with its
-- server-side service-role credential; clients have no direct table access.
revoke all on table public.ai_news_summaries from public, anon, authenticated;
grant select, insert, update on table public.ai_news_summaries to service_role;
