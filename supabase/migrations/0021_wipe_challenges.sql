-- daily_challenges.challenge_id has no ON DELETE cascade/set null, so the
-- referencing rows have to go first or the challenges delete is rejected.
delete from public.daily_challenges;
delete from public.challenges;
