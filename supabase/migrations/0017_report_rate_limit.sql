-- Caps reporting to one every 2 hours per person, on top of the existing
-- unique(completion_id, reporter_id) constraint that already blocks
-- reporting the same photo twice. This is enforced here (not just in app
-- code) so it holds even if someone calls the API directly.
drop policy "friends can report a completion they can see" on public.reports;

create policy "friends can report a completion they can see"
  on public.reports for insert
  to authenticated
  with check (
    reporter_id = auth.uid()
    and not public.is_banned(auth.uid())
    and public.completion_owner(completion_id) <> auth.uid()
    and public.can_view_completion(completion_id)
    and not exists (
      select 1 from public.reports
      where reporter_id = auth.uid()
        and created_at > now() - interval '2 hours'
    )
  );
