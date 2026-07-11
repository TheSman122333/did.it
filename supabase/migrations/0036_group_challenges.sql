-- Group-created prompts live in the same challenges table so a graduated
-- prompt joins the main pool by flipping `active` -- no copying. `active`
-- now strictly means "in the main daily draw": system prompts start true,
-- group prompts start false and only graduation (0039) flips them.
alter table public.challenges
  add column group_id uuid references public.groups (id) on delete cascade,
  add column created_by uuid references public.profiles (id) on delete set null,
  add column removed boolean not null default false;

drop policy "challenges are readable by any authenticated user" on public.challenges;

create policy "challenges are readable if system, graduated, or in your group"
  on public.challenges for select
  to authenticated
  using (
    group_id is null
    or active
    or public.is_group_member(group_id, auth.uid())
  );

create policy "members can add prompts to their group"
  on public.challenges for insert
  to authenticated
  with check (
    group_id is not null
    and created_by = auth.uid()
    and public.is_group_member(group_id, auth.uid())
    and active = false
    and removed = false
    and not public.is_banned(auth.uid())
  );

-- Each group gets its own one-row-per-date daily draw alongside the main
-- one, so the plain unique(date) has to become two partial indexes.
alter table public.daily_challenges
  add column group_id uuid references public.groups (id) on delete cascade;

alter table public.daily_challenges drop constraint daily_challenges_date_key;

create unique index daily_challenges_one_main_per_date
  on public.daily_challenges (date)
  where group_id is null;

create unique index daily_challenges_one_per_group_per_date
  on public.daily_challenges (date, group_id)
  where group_id is not null;

drop policy "any authenticated user can create today's challenge" on public.daily_challenges;

create policy "any authenticated user can create today's challenge"
  on public.daily_challenges for insert
  to authenticated
  with check (
    date <= current_date
    and (group_id is null or public.is_group_member(group_id, auth.uid()))
  );

-- Discovery should never surface group activity: keep it to main daily
-- challenge completions only.
create or replace function public.get_discover_feed(max_rows int default 12)
returns table (
  user_id uuid,
  handle text,
  display_name text,
  avatar_url text,
  prompt text,
  completed_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select user_id, handle, display_name, avatar_url, prompt, completed_at
  from (
    select distinct on (p.id)
      p.id as user_id,
      p.handle,
      p.display_name,
      p.avatar_url,
      ch.prompt,
      c.created_at as completed_at
    from public.completions c
    join public.profiles p on p.id = c.user_id
    join public.daily_challenges dc on dc.id = c.daily_challenge_id
    join public.challenges ch on ch.id = dc.challenge_id
    where c.user_id <> auth.uid()
      and dc.group_id is null
      and not c.removed
      and not p.banned
      and c.created_at > now() - interval '7 days'
      and not exists (
        select 1 from public.friendships f
        where (f.requester_id = auth.uid() and f.addressee_id = p.id)
           or (f.requester_id = p.id and f.addressee_id = auth.uid())
      )
    order by p.id, c.created_at desc
  ) latest
  order by random()
  limit max_rows;
$$;
