"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { currentChallengeDate } from "@/lib/challengeDate";
import { assertNotBanned } from "@/lib/moderation";

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

  const [{ data: squares, error: squaresError }, { data: progress, error: progressError }] =
    await Promise.all([
      supabase
        .from("bingo_square_completions")
        .select("position")
        .eq("user_id", userId)
        .eq("bingo_card_id", bingoCardId),
      supabase
        .from("user_bingo_progress")
        .select("completed_at")
        .eq("user_id", userId)
        .eq("bingo_card_id", bingoCardId)
        .maybeSingle(),
    ]);

  if (squaresError) throw squaresError;
  if (progressError) throw progressError;

  return {
    markedPositions: (squares ?? []).map((s) => s.position),
    completed: Boolean(progress?.completed_at),
  };
}

// photo-proof claim for one square, same upload-then-insert shape as
// submitCompletion. returns whether the card now has a bingo.
export async function submitBingoSquare(formData: FormData): Promise<{ won: boolean }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not logged in");
  await assertNotBanned(supabase, user.id);

  const bingoCardId = formData.get("bingoCardId");
  const positionRaw = formData.get("position");
  const photo = formData.get("photo");

  if (typeof bingoCardId !== "string" || !bingoCardId) {
    throw new Error("Missing bingo card id");
  }
  const position = Number(positionRaw);
  if (!Number.isInteger(position) || position < 0 || position > 24) {
    throw new Error("Invalid square");
  }
  if (!(photo instanceof File) || photo.size === 0) {
    throw new Error("Missing photo");
  }

  const photoPath = `${user.id}/bingo-${bingoCardId}-${position}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from("completions")
    .upload(photoPath, photo, {
      contentType: photo.type || "image/jpeg",
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const { error: insertError } = await supabase.from("bingo_square_completions").insert({
    user_id: user.id,
    bingo_card_id: bingoCardId,
    position,
    photo_path: photoPath,
  });

  // 23505 means this square was already claimed, which is fine
  if (insertError && insertError.code !== "23505") {
    await supabase.storage.from("completions").remove([photoPath]);
    throw insertError;
  }

  const [{ data: squares, error: squaresError }, { data: progress }] = await Promise.all([
    supabase
      .from("bingo_square_completions")
      .select("position")
      .eq("user_id", user.id)
      .eq("bingo_card_id", bingoCardId),
    supabase
      .from("user_bingo_progress")
      .select("completed_at")
      .eq("user_id", user.id)
      .eq("bingo_card_id", bingoCardId)
      .maybeSingle(),
  ]);

  if (squaresError) throw squaresError;

  const marked = new Set((squares ?? []).map((s) => s.position));
  const won = checkBingoWin(marked);
  // completed_at only ever gets set once per card, so the profile counter
  // can't be inflated by claiming more squares after the win
  const firstWin = won && !progress?.completed_at;

  if (firstWin) {
    const { error: progressError } = await supabase.from("user_bingo_progress").upsert(
      {
        user_id: user.id,
        bingo_card_id: bingoCardId,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,bingo_card_id" }
    );

    if (progressError) throw progressError;

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
  return { won };
}
