-- The per-user quest model (quests/daily_quests) is fully superseded by
-- challenges/daily_challenges as of the social refactor. Their prompts
-- were already copied into public.challenges in 0002_challenges.sql, and
-- no app code references these tables anymore.
drop table if exists public.daily_quests;
drop table if exists public.quests;
