"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { currentChallengeDate } from "@/lib/challengeDate";

export type BingoSquare = {
  position: number;
  prompt: string;
};

export type BingoCard = {
  id: string;
  weekStartDate: string;
  squares: BingoSquare[];
};

export type BingoProgress = {
  markedPositions: number[];
  completed: boolean;
};

type BingoCardRow = {
  id: string;
  week_start_date: string;
  bingo_card_challenges: { position: number; challenge: { prompt: string } }[];
};

const CARD_SELECT =
  "id, week_start_date, bingo_card_challenges(position, challenge:challenges(prompt))";

// the week flips with the challenge day (noon eastern), not raw server time
function currentWeekStartDate(): string {
  const [year, month, day] = currentChallengeDate().split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  return date.toISOString().split("T")[0];
}

function toBingoCard(row: BingoCardRow): BingoCard {
  return {
    id: row.id,
    weekStartDate: row.week_start_date,
    squares: row.bingo_card_challenges
      .map((c) => ({ position: c.position, prompt: c.challenge.prompt }))
      .sort((a, b) => a.position - b.position),
  };
}

function checkBingoWin(marked: Set<number>): boolean {
  for (let i = 0; i < 5; i++) {
    let row = 0;
    let col = 0;
    for (let j = 0; j < 5; j++) {
      if (marked.has(i * 5 + j)) row++;
      if (marked.has(j * 5 + i)) col++;
    }
    if (row === 5 || col === 5) return true;
  }

  let diag = 0;
  let antiDiag = 0;
  for (let i = 0; i < 5; i++) {
    if (marked.has(i * 5 + i)) diag++;
    if (marked.has(i * 5 + (4 - i))) antiDiag++;
  }
  return diag === 5 || antiDiag === 5;
}

function parseMarked(value: string | null | undefined): Set<number> {
  return new Set(value ? value.split(",").map(Number) : []);
}

export async function getThisWeeksBingoCard(): Promise<BingoCard> {
  const supabase = await createClient();
  const weekStart = currentWeekStartDate();

  const { data: existing, error: fetchError } = await supabase
    .from("bingo_cards")
    .select(CARD_SELECT)
    .eq("week_start_date", weekStart)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (existing) return toBingoCard(existing as unknown as BingoCardRow);

  const { data: pool, error: poolError } = await supabase
    .from("challenges")
    .select("id")
    .eq("active", true);

  if (poolError) throw poolError;
  if (!pool || pool.length < 25) {
    throw new Error("Not enough active challenges for a bingo card (need 25)");
  }

  const ids = pool.map((c) => c.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }

  const { data: card, error: insertError } = await supabase
    .from("bingo_cards")
    .insert({ week_start_date: weekStart })
    .select("id")
    .single();

  // someone else already created this week's card, just refetch it
  if (insertError?.code === "23505") {
    return getThisWeeksBingoCard();
  }
  if (insertError || !card) {
    throw insertError ?? new Error("Failed to create this week's bingo card");
  }

  const { error: squaresError } = await supabase.from("bingo_card_challenges").insert(
    ids.slice(0, 25).map((challengeId, position) => ({
      bingo_card_id: card.id,
      position,
      challenge_id: challengeId,
    }))
  );

  if (squaresError) throw squaresError;

  return getThisWeeksBingoCard();
}

export async function getMyBingoProgress(
  userId: string,
  bingoCardId: string
): Promise<BingoProgress> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_bingo_progress")
    .select("marked_positions, completed_at")
    .eq("user_id", userId)
    .eq("bingo_card_id", bingoCardId)
    .maybeSingle();

  if (error) throw error;

  return {
    markedPositions: [...parseMarked(data?.marked_positions)],
    completed: Boolean(data?.completed_at),
  };
}

// returns whether the card currently has a bingo, so the client can show it
export async function toggleBingoSquare(
  bingoCardId: string,
  position: number
): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not logged in");

  if (!Number.isInteger(position) || position < 0 || position > 24) {
    throw new Error("Invalid square");
  }

  const { data: existing, error: readError } = await supabase
    .from("user_bingo_progress")
    .select("marked_positions, completed_at")
    .eq("user_id", user.id)
    .eq("bingo_card_id", bingoCardId)
    .maybeSingle();

  if (readError) throw readError;

  const marked = parseMarked(existing?.marked_positions);
  if (marked.has(position)) {
    marked.delete(position);
  } else {
    marked.add(position);
  }

  const won = checkBingoWin(marked);
  // completed_at only ever gets set once, so unmarking and re-marking
  // squares can't farm the profile counter
  const firstWin = won && !existing?.completed_at;

  const { error: upsertError } = await supabase.from("user_bingo_progress").upsert(
    {
      user_id: user.id,
      bingo_card_id: bingoCardId,
      marked_positions: [...marked].sort((a, b) => a - b).join(","),
      completed_at: existing?.completed_at ?? (firstWin ? new Date().toISOString() : null),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,bingo_card_id" }
  );

  if (upsertError) throw upsertError;

  if (firstWin) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("bingo_cards_completed")
      .eq("id", user.id)
      .single();

    const { error: countError } = await supabase
      .from("profiles")
      .update({ bingo_cards_completed: (profile?.bingo_cards_completed ?? 0) + 1 })
      .eq("id", user.id);

    if (countError) throw countError;
  }

  revalidatePath("/");
  revalidatePath("/profile");
  return won || Boolean(existing?.completed_at);
}
