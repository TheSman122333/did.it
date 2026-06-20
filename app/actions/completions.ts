"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getMyFriends, type Profile } from "@/app/actions/friends";
import { currentDareDate, previousDareDate } from "@/lib/dareDate";

export type FeedItem = {
  friend: Profile;
  completedToday: boolean;
  photoUrl: string | null;
};

export async function getFriendsFeedForToday(
  userId: string,
  dailyChallengeId: string
): Promise<FeedItem[]> {
  const supabase = await createClient();
  const friends = await getMyFriends(userId);
  if (friends.length === 0) return [];

  const { data: completions, error } = await supabase
    .from("completions")
    .select("user_id, photo_path")
    .eq("daily_challenge_id", dailyChallengeId)
    .in("user_id", friends.map((f) => f.id));

  if (error) throw error;

  const photoPathByUser = new Map((completions ?? []).map((c) => [c.user_id, c.photo_path]));

  return Promise.all(
    friends.map(async (friend) => {
      const photoPath = photoPathByUser.get(friend.id);
      if (!photoPath) {
        return { friend, completedToday: false, photoUrl: null };
      }
      const { data: signed } = await supabase.storage
        .from("completions")
        .createSignedUrl(photoPath, 60 * 10);
      return { friend, completedToday: true, photoUrl: signed?.signedUrl ?? null };
    })
  );
}

export async function submitCompletion(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not logged in");

  const dailyChallengeId = formData.get("dailyChallengeId");
  const photo = formData.get("photo");

  if (typeof dailyChallengeId !== "string" || !dailyChallengeId) {
    throw new Error("Missing daily challenge id");
  }
  if (!(photo instanceof File) || photo.size === 0) {
    throw new Error("Missing photo");
  }

  const photoPath = `${user.id}/${dailyChallengeId}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from("completions")
    .upload(photoPath, photo, {
      contentType: photo.type || "image/jpeg",
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const { data, error: insertError } = await supabase
    .from("completions")
    .insert({
      user_id: user.id,
      daily_challenge_id: dailyChallengeId,
      photo_path: photoPath,
    })
    .select("*")
    .single();

  if (insertError) {
    // Already completed today (race or resubmit) -- not a real failure,
    // just return the existing row instead of leaving an orphaned upload.
    if (insertError.code === "23505") {
      const { data: existing, error: refetchError } = await supabase
        .from("completions")
        .select("*")
        .eq("user_id", user.id)
        .eq("daily_challenge_id", dailyChallengeId)
        .single();

      if (refetchError) throw refetchError;
      return existing;
    }

    await supabase.storage.from("completions").remove([photoPath]);
    throw insertError;
  }

  revalidatePath("/");
  return data;
}

export async function getStreak(userId: string): Promise<number> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("completions")
    .select("daily_challenge:daily_challenges(date)")
    .eq("user_id", userId);

  if (error) throw error;

  const completedDates = new Set(
    (data ?? [])
      .map((row) => {
        const dc = row.daily_challenge as unknown as { date: string } | null;
        return dc?.date;
      })
      .filter((d): d is string => Boolean(d))
  );

  let cursorStr = currentDareDate();

  // Don't break the streak just because today hasn't been completed yet --
  // start counting from yesterday if today is still open.
  if (!completedDates.has(cursorStr)) {
    cursorStr = previousDareDate(cursorStr);
  }

  let streak = 0;
  while (completedDates.has(cursorStr)) {
    streak++;
    cursorStr = previousDareDate(cursorStr);
  }

  return streak;
}
