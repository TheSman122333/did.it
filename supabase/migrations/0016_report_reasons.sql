-- A fixed set of reasons so they can actually be grouped and compared --
-- free text would mean "spam" and "Spam" never match. Existing rows (all
-- null, since the UI never collected a reason before this) stay valid.
alter table public.reports
  add constraint reports_reason_check
  check (reason is null or reason in ('spam', 'inappropriate', 'fake', 'other'));

-- Same two jobs as before (hide a bad photo, ban a repeat offender), with
-- two refinements:
--   1. Hiding a photo now requires `comp_threshold` distinct people to
--      agree on the SAME reason. A few friends each reporting for
--      different reasons reads as shenanigans, not a real problem, so it
--      no longer counts at all -- not even toward a softer threshold.
--   2. Banning now requires the reports to span at least `user_post_min`
--      different posts, not just `user_report_threshold` people piling on
--      one unlucky photo.
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
  same_reason_reporters int;
  owner_report_count int;
  owner_distinct_posts int;
begin
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

  return new;
end;
$$;
