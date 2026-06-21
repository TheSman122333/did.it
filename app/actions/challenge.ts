"use server";

import { createClient } from "@/lib/supabase/server";
import { currentChallengeDate } from "@/lib/challengeDate";

type Challenge = {
  id: string;
  prompt: string;
  active: boolean;
  created_at: string;
};

export type DailyChallenge = {
  id: string;
  challenge_id: string;
  date: string;
  reveal_at: string;
  created_at: string;
  challenge: Challenge;
};

export async function getTodaysChallenge(): Promise<DailyChallenge> {
  const supabase = await createClient();
  const date = currentChallengeDate();

  const { data: existing, error: fetchError } = await supabase
    .from("daily_challenges")
    .select("*")
    .eq("date", date)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (existing) {
    const { data: challenge, error: challengeError } = await supabase
      .from("challenges")
      .select("*")
      .eq("id", existing.challenge_id)
      .single();

    if (challengeError) throw challengeError;

    return { ...existing, challenge };
  }

  const { data: pool, error: poolError } = await supabase
    .from("challenges")
    .select("*")
    .eq("active", true);

  if (poolError || !pool?.length) {
    throw new Error("No active challenges available");
  }

  const picked = pool[Math.floor(Math.random() * pool.length)];

  const { data: inserted, error: insertError } = await supabase
    .from("daily_challenges")
    .insert({ challenge_id: picked.id, date })
    .select("*")
    .single();

  // someone else already created today's row, just refetch it
  if (insertError?.code === "23505") {
    return getTodaysChallenge();
  }

  if (insertError || !inserted) {
    throw insertError ?? new Error("Failed to create today's challenge");
  }

  return { ...inserted, challenge: picked };
}

export async function getMyCompletionForToday(
  userId: string,
  dailyChallengeId: string
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("completions")
    .select("*")
    .eq("user_id", userId)
    .eq("daily_challenge_id", dailyChallengeId)
    .maybeSingle();

  if (error) throw error;

  return data;
}
