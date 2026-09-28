create table if not exists public.saved_news (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  article_url text not null check (length(trim(article_url)) > 0),
  title text not null check (length(trim(title)) > 0),
  description text,
  image_url text,
  source_name text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  constraint saved_news_user_article_unique unique (user_id, article_url)
);

create index if not exists saved_news_user_published_at_idx
  on public.saved_news (user_id, published_at desc, created_at desc);

alter table public.saved_news enable row level security;

revoke all on table public.saved_news from public, anon;
grant select, insert, delete on table public.saved_news to authenticated;

drop policy if exists "Users can read their own saved news" on public.saved_news;
create policy "Users can read their own saved news"
  on public.saved_news for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can save their own news" on public.saved_news;
create policy "Users can save their own news"
  on public.saved_news for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can remove their own saved news" on public.saved_news;
create policy "Users can remove their own saved news"
  on public.saved_news for delete to authenticated
  using (auth.uid() = user_id);
