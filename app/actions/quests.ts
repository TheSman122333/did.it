"use server";

import { createClient } from "@/lib/supabase/server";

export async function ensureTodayQuest(userId: string) {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: existing, error: fetchError } = await supabase
    .from("daily_quests")
    .select("*")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (existing) {
    // fetched separately, no join here
    const { data: quest } = await supabase
      .from("quests")
      .select("*")
      .eq("id", existing.quest_id)
      .maybeSingle();

    return { ...existing, quest };
  }

  const { data: quests, error: qErr } = await supabase
    .from("quests")
    .select("*");

  if (qErr || !quests?.length) {
    throw new Error("No quests available");
  }

  const random = quests[Math.floor(Math.random() * quests.length)];

  const { data: inserted, error: insertError } = await supabase
    .from("daily_quests")
    .insert({
      user_id: userId,
      quest_id: random.id,
      date: today,
      completed: false,
    })
    .select("*")
    .maybeSingle();

  if (insertError || !inserted) {
    console.error("INSERT ERROR:", insertError);
    throw new Error("Failed to create daily quest");
  }

  return { ...inserted, quest: random };
}

export async function completeQuest(dailyQuestId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("daily_quests")
    .update({
      completed: true,
      completed_at: new Date(),
    })
    .eq("id", dailyQuestId)
    .select("*")
    .maybeSingle();

  if (error) throw error;

  return data;
}