-- Shared helpers for claps/comments/reports: who owns a completion, and
-- whether the caller is allowed to interact with it at all (must be the
-- friend graph, never the post's own author, and the author's own
-- claps/comments toggle has to be on).
create or replace function public.completion_owner(comp_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select user_id from public.completions where id = comp_id;
$$;

create or replace function public.can_view_completion(comp_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  owner uuid;
begin
  owner := public.completion_owner(comp_id);
  if owner is null then
    return false;
  end if;
  return owner = auth.uid() or public.are_friends(auth.uid(), owner);
end;
$$;

create or replace function public.can_interact(comp_id uuid, kind text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  owner uuid;
  allowed boolean;
begin
  owner := public.completion_owner(comp_id);
  if owner is null or owner = auth.uid() or public.is_banned(auth.uid()) then
    return false;
  end if;
  if not public.are_friends(auth.uid(), owner) then
    return false;
  end if;
  if kind = 'clap' then
    select allow_claps into allowed from public.profiles where id = owner;
  else
    select allow_comments into allowed from public.profiles where id = owner;
  end if;
  return coalesce(allowed, true);
end;
$$;

-- Claps: one per user per completion, toggled on/off rather than spammable.
create table public.claps (
  id uuid primary key default gen_random_uuid(),
  completion_id uuid not null references public.completions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (completion_id, user_id)
);

alter table public.claps enable row level security;

create policy "anyone who can see the completion can see its claps"
  on public.claps for select
  to authenticated
  using (public.can_view_completion(completion_id));

create policy "friends can clap if the owner allows it"
  on public.claps for insert
  to authenticated
  with check (user_id = auth.uid() and public.can_interact(completion_id, 'clap'));

create policy "users can remove their own clap"
  on public.claps for delete
  to authenticated
  using (user_id = auth.uid());

-- Comments.
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  completion_id uuid not null references public.completions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

alter table public.comments enable row level security;

create policy "anyone who can see the completion can read its comments"
  on public.comments for select
  to authenticated
  using (public.can_view_completion(completion_id));

create policy "friends can comment if the owner allows it"
  on public.comments for insert
  to authenticated
  with check (user_id = auth.uid() and public.can_interact(completion_id, 'comment'));

create policy "users can delete their own comment"
  on public.comments for delete
  to authenticated
  using (user_id = auth.uid());

-- Reports. No select policy -- moderation counting happens server-side via
-- the trigger below (security definer, bypasses RLS), nobody needs to read
-- the raw reports table from the client for this feature.
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  completion_id uuid not null references public.completions (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  unique (completion_id, reporter_id)
);

alter table public.reports enable row level security;

create policy "friends can report a completion they can see"
  on public.reports for insert
  to authenticated
  with check (
    reporter_id = auth.uid()
    and not public.is_banned(auth.uid())
    and public.completion_owner(completion_id) <> auth.uid()
    and public.can_view_completion(completion_id)
  );

-- Auto-moderation: enough distinct reporters on one photo hides it; enough
-- distinct reporters across someone's whole history bans the account.
-- Thresholds are deliberately low for a small friend-group app -- tune
-- `comp_threshold` / `user_threshold` as the user base grows.
create or replace function public.handle_new_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  comp_owner uuid;
  comp_threshold constant int := 3;
  user_threshold constant int := 10;
  comp_report_count int;
  owner_report_count int;
begin
  comp_owner := public.completion_owner(new.completion_id);

  select count(distinct reporter_id) into comp_report_count
  from public.reports
  where completion_id = new.completion_id;

  if comp_report_count >= comp_threshold then
    update public.completions set removed = true where id = new.completion_id;
  end if;

  select count(distinct r.reporter_id) into owner_report_count
  from public.reports r
  join public.completions c on c.id = r.completion_id
  where c.user_id = comp_owner;

  if owner_report_count >= user_threshold then
    update public.profiles set banned = true where id = comp_owner;
  end if;

  return new;
end;
$$;

create trigger on_report_created
  after insert on public.reports
  for each row execute function public.handle_new_report();
