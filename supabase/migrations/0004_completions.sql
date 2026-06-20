-- Per-user proof-of-completion for a given day's challenge. A row's mere
-- existence means "completed" -- replaces the old completed/completed_at
-- boolean columns on daily_quests entirely.
create table public.completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  daily_challenge_id uuid not null references public.daily_challenges (id) on delete cascade,
  photo_path text not null,
  caption text,
  created_at timestamptz not null default now(),
  unique (user_id, daily_challenge_id)
);

alter table public.completions enable row level security;

create policy "users can read their own completions"
  on public.completions for select
  to authenticated
  using (user_id = auth.uid());

create policy "users can insert their own completions"
  on public.completions for insert
  to authenticated
  with check (user_id = auth.uid());

-- Private bucket: photos are personal and only meant to be seen by the
-- owner and (from Phase 2 on) accepted friends. Reads happen via
-- server-minted signed URLs after an app-level friendship check, not via
-- a storage policy encoding the friend graph.
insert into storage.buckets (id, name, public)
values ('completions', 'completions', false)
on conflict (id) do nothing;

create policy "users can upload completion photos to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'completions'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users can read their own completion photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'completions'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
