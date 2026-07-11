-- Reports now target either a completion photo or a challenge prompt,
-- exactly one of the two. The existing completion policies and trigger
-- logic are preserved byte for byte; challenge reports get their own
-- insert policy (same 2-hour rate limit) and their own trigger branch.
alter table public.reports
  alter column completion_id drop not null,
  add column challenge_id uuid references public.challenges (id) on delete cascade,
  add constraint reports_exactly_one_target
    check ((completion_id is null) <> (challenge_id is null));

-- unique(completion_id, reporter_id) can't dedupe challenge reports since
-- their completion_id is null on both rows and nulls never match.
create unique index reports_one_per_challenge_per_reporter
  on public.reports (challenge_id, reporter_id)
  where challenge_id is not null;

-- Visibility is enforced by the challenges select RLS inside the exists()
-- (the subquery runs as the reporter), so a private group's prompt can
-- only be reported by its own members. System prompts have created_by
-- null, hence `is distinct from` rather than `<>`.
create policy "users can report a challenge they can see"
  on public.reports for insert
  to authenticated
  with check (
    challenge_id is not null
    and reporter_id = auth.uid()
    and not public.is_banned(auth.uid())
    and exists (
      select 1 from public.challenges ch
      where ch.id = challenge_id
        and ch.created_by is distinct from auth.uid()
    )
    and not exists (
      select 1 from public.reports
      where reporter_id = auth.uid()
        and created_at > now() - interval '2 hours'
    )
  );

-- Completion branch unchanged from 0016. Challenge branch: 3 distinct
-- same-reason reporters hide the prompt AND pull it from the main draw in
-- the same stroke, in case it had already graduated. No ban escalation
-- from bad prompts -- that stays specific to repeated bad photos.
create or replace function public.handle_new_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  comp_owner uuid;
  comp_threshold constant int := 3;
  user_report_threshold constant int := 10;
  user_post_min constant int := 3;
  challenge_threshold constant int := 3;
  same_reason_reporters int;
  owner_report_count int;
  owner_distinct_posts int;
begin
  if new.completion_id is not null then
    comp_owner := public.completion_owner(new.completion_id);

    select count(distinct reporter_id) into same_reason_reporters
    from public.reports
    where completion_id = new.completion_id
      and reason is not distinct from new.reason;

    if same_reason_reporters >= comp_threshold then
      update public.completions set removed = true where id = new.completion_id;
    end if;

    select count(*), count(distinct completion_id) into owner_report_count, owner_distinct_posts
    from public.reports r
    join public.completions c on c.id = r.completion_id
    where c.user_id = comp_owner;

    if owner_report_count >= user_report_threshold and owner_distinct_posts >= user_post_min then
      update public.profiles set banned = true where id = comp_owner;
    end if;
  else
    select count(distinct reporter_id) into same_reason_reporters
    from public.reports
    where challenge_id = new.challenge_id
      and reason is not distinct from new.reason;

    if same_reason_reporters >= challenge_threshold then
      update public.challenges
      set removed = true, active = false
      where id = new.challenge_id;
    end if;
  end if;

  return new;
end;
$$;
