-- Group co-members aren't necessarily mutual friends, but they need to see
-- each other's group-challenge completions (rows, photos, claps,
-- comments). Adds a same-group branch to the two visibility helpers and
-- the read policies. For any completion on the main daily challenge
-- (group_id null) every path below resolves to exactly the old logic.
create or replace function public.completion_group(comp_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select dc.group_id
  from public.completions c
  join public.daily_challenges dc on dc.id = c.daily_challenge_id
  where c.id = comp_id;
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
  grp uuid;
begin
  owner := public.completion_owner(comp_id);
  if owner is null then
    return false;
  end if;
  if owner = auth.uid() or public.are_friends(auth.uid(), owner) then
    return true;
  end if;
  grp := public.completion_group(comp_id);
  return grp is not null and public.is_group_member(grp, auth.uid());
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
  grp uuid;
  allowed boolean;
begin
  owner := public.completion_owner(comp_id);
  if owner is null or owner = auth.uid() or public.is_banned(auth.uid()) then
    return false;
  end if;
  if not public.are_friends(auth.uid(), owner) then
    grp := public.completion_group(comp_id);
    if grp is null or not public.is_group_member(grp, auth.uid()) then
      return false;
    end if;
  end if;
  if kind = 'clap' then
    select allow_claps into allowed from public.profiles where id = owner;
  else
    select allow_comments into allowed from public.profiles where id = owner;
  end if;
  return coalesce(allowed, true);
end;
$$;

create policy "group members can read group completions"
  on public.completions for select
  to authenticated
  using (
    exists (
      select 1 from public.daily_challenges dc
      where dc.id = daily_challenge_id
        and dc.group_id is not null
        and public.is_group_member(dc.group_id, auth.uid())
    )
  );

-- Photos are stored as {owner_id}/{daily_challenge_id}.jpg, so the daily
-- challenge id is recoverable from the object name. Comparing dc.id::text
-- against the parsed filename (rather than casting the filename to uuid)
-- keeps non-uuid names like bingo-*.jpg from erroring -- they just never
-- match.
create policy "group members can read group completion photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'completions'
    and exists (
      select 1 from public.daily_challenges dc
      where dc.group_id is not null
        and public.is_group_member(dc.group_id, auth.uid())
        and dc.id::text = split_part(storage.filename(name), '.', 1)
    )
  );
