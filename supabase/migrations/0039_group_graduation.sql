-- The lucky path into the main pool: when a public group's daily challenge
-- has been completed by every member and the prompt has zero reports, the
-- completing submit rolls a small chance of promoting the prompt into the
-- shared daily draw (challenges.active = true).
--
-- Guards: public groups only, needs at least 2 members so a solo group
-- can't farm prompts into everyone's rotation, never re-promotes a removed
-- or already-active prompt. One-way: reports can pull it back out (0038),
-- membership changes never do.
create or replace function public.handle_group_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  grad_chance constant float := 0.05;
  min_members constant int := 2;
  grp uuid;
  chal uuid;
  member_count int;
  completed_count int;
begin
  select dc.group_id, dc.challenge_id into grp, chal
  from public.daily_challenges dc
  where dc.id = new.daily_challenge_id;

  if grp is null then
    return new;
  end if;

  if not exists (select 1 from public.groups g where g.id = grp and g.is_public) then
    return new;
  end if;

  if exists (
    select 1 from public.challenges ch
    where ch.id = chal and (ch.active or ch.removed or ch.group_id is null)
  ) then
    return new;
  end if;

  if exists (select 1 from public.reports r where r.challenge_id = chal) then
    return new;
  end if;

  select count(*) into member_count
  from public.group_members
  where group_id = grp;

  if member_count < min_members then
    return new;
  end if;

  select count(*) into completed_count
  from public.group_members gm
  where gm.group_id = grp
    and exists (
      select 1 from public.completions c
      where c.daily_challenge_id = new.daily_challenge_id
        and c.user_id = gm.user_id
    );

  if completed_count = member_count and random() < grad_chance then
    update public.challenges set active = true where id = chal;
  end if;

  return new;
end;
$$;

create trigger on_group_completion_created
  after insert on public.completions
  for each row execute function public.handle_group_completion();
