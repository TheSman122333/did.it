"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getMyFriends, type Profile } from "@/app/actions/friends";
import { currentChallengeDate, previousChallengeDate } from "@/lib/challengeDate";
import { assertNotBanned } from "@/lib/moderation";
import { notifyUsers } from "@/lib/push";

export type FeedItem = {
  completionId: string;
  friend: Profile;
  photoUrl: string | null;
  removed: boolean;
  caption: string | null;
  createdAt: string;
  challengePrompt: string;
  clapsCount: number;
  clappedByMe: boolean;
  commentsCount: number;
  isUnread: boolean;
};

export type FriendStatus = {
  friend: Profile;
  completedToday: boolean;
};

type CompletionRow = {
  id: string;
  user_id: string;
  photo_path: string;
  removed: boolean;
  caption: string | null;
  created_at: string;
  daily_challenge: { challenge: { prompt: string } } | null;
  claps: { count: number }[] | null;
  comments: { id: string; created_at: string }[] | null;
};

// shared by the feed + friend profile, friend list passed in to avoid refetching it 2-3x
async function buildFeedItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userIds: string[],
  friendById: Map<string, Profile>,
  viewerId: string,
  limit: number
): Promise<FeedItem[]> {
  if (userIds.length === 0) return [];

  // independent, run together instead of two round trips back to back
  const [{ data: viewer }, { data: completions, error }] = await Promise.all([
    supabase.from("profiles").select("feed_last_seen_at").eq("id", viewerId).maybeSingle(),
    supabase
      .from("completions")
      .select(
        "id, user_id, photo_path, removed, caption, created_at, daily_challenge:daily_challenges(challenge:challenges(prompt)), claps(count), comments(id, created_at)"
      )
      .in("user_id", userIds)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  if (error) throw error;

  const lastSeenAt = viewer?.feed_last_seen_at ? new Date(viewer.feed_last_seen_at) : null;
  const rows = (completions ?? []) as unknown as CompletionRow[];
  if (rows.length === 0) return [];

  const photoPaths = rows.filter((r) => !r.removed).map((r) => r.photo_path);

  // batched signed urls instead of one request per photo. this was the slow one
  const [{ data: myClaps }, { data: signedUrls }] = await Promise.all([
    supabase
      .from("claps")
      .select("completion_id")
      .eq("user_id", viewerId)
      .in("completion_id", rows.map((r) => r.id)),
    photoPaths.length > 0
      ? supabase.storage.from("completions").createSignedUrls(photoPaths, 60 * 10)
      : Promise.resolve({ data: [] as { path: string | null; signedUrl: string }[] }),
  ]);

  const myClapSet = new Set((myClaps ?? []).map((c) => c.completion_id));
  const signedUrlByPath = new Map(
    (signedUrls ?? []).filter((s) => s.path).map((s) => [s.path as string, s.signedUrl])
  );

  return rows.map((row) => {
    const friend = friendById.get(row.user_id);
    if (!friend) throw new Error("Completion from a user not in the expected friend set");

    const comments = row.comments ?? [];
    const latestCommentAt = comments.reduce<string | null>(
      (max, c) => (!max || c.created_at > max ? c.created_at : max),
      null
    );

    const isUnread =
      !lastSeenAt ||
      new Date(row.created_at) > lastSeenAt ||
      (latestCommentAt !== null && new Date(latestCommentAt) > lastSeenAt);

    return {
      completionId: row.id,
      friend,
      photoUrl: row.removed ? null : signedUrlByPath.get(row.photo_path) ?? null,
      removed: row.removed,
      caption: row.caption,
      createdAt: row.created_at,
      challengePrompt: row.daily_challenge?.challenge.prompt ?? "",
      clapsCount: row.claps?.[0]?.count ?? 0,
      clappedByMe: myClapSet.has(row.id),
      commentsCount: comments.length,
      isUnread,
    };
  });
}

export async function getFriendsFeed(
  viewerId: string,
  friends: Profile[],
  limit = 30
): Promise<FeedItem[]> {
  if (friends.length === 0) return [];

  const supabase = await createClient();
  const friendById = new Map(friends.map((f) => [f.id, f]));
  return buildFeedItems(supabase, friends.map((f) => f.id), friendById, viewerId, limit);
}

// for the friend profile page, RLS backs this up either way
export async function getUserCompletions(
  targetUser: Profile,
  viewerId: string,
  limit = 30
): Promise<FeedItem[]> {
  const supabase = await createClient();
  const friendById = new Map([[targetUser.id, targetUser]]);
  return buildFeedItems(supabase, [targetUser.id], friendById, viewerId, limit);
}

// friends tab is just status, no photo -- that's the feed's job
export async function getFriendsTodayStatus(
  friends: Profile[],
  dailyChallengeId: string
): Promise<FriendStatus[]> {
  if (friends.length === 0) return [];

  const supabase = await createClient();
  const { data: completions, error } = await supabase
    .from("completions")
    .select("user_id")
    .eq("daily_challenge_id", dailyChallengeId)
    .in("user_id", friends.map((f) => f.id));

  if (error) throw error;

  const completedSet = new Set((completions ?? []).map((c) => c.user_id));
  return friends.map((friend) => ({ friend, completedToday: completedSet.has(friend.id) }));
}

// called from the client once the feed pane is actually visible
export async function markFeedSeen() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("profiles")
    .update({ feed_last_seen_at: new Date().toISOString() })
    .eq("id", user.id);
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

export async function submitCompletion(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not logged in");
  await assertNotBanned(supabase, user.id);

  const dailyChallengeId = formData.get("dailyChallengeId");
  const photo = formData.get("photo");
  const captionRaw = formData.get("caption");

  if (typeof dailyChallengeId !== "string" || !dailyChallengeId) {
    throw new Error("Missing daily challenge id");
  }
  if (!(photo instanceof File) || photo.size === 0) {
    throw new Error("Missing photo");
  }

  const caption =
    typeof captionRaw === "string" && captionRaw.trim().length > 0
      ? captionRaw.trim().slice(0, 280)
      : null;

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
      caption,
    })
    .select("*")
    .single();

  if (insertError) {
    // already completed today, not a real error, just hand back the existing row
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

  const friends = await getMyFriends(user.id);
  if (friends.length > 0) {
    const { data: actor } = await supabase
      .from("profiles")
      .select("handle, display_name")
      .eq("id", user.id)
      .maybeSingle();
    const name = actor?.display_name || (actor ? `@${actor.handle}` : "A friend");

    after(() =>
      notifyUsers(supabase, friends.map((f) => f.id), {
        title: "did.it",
        body: `${name} completed today's challenge`,
        url: "/social",
      })
    );
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

  let cursorStr = currentChallengeDate();

  // today being open doesn't break the streak, start from yesterday if so
  if (!completedDates.has(cursorStr)) {
    cursorStr = previousChallengeDate(cursorStr);
  }

  let streak = 0;
  while (completedDates.has(cursorStr)) {
    streak++;
    cursorStr = previousChallengeDate(cursorStr);
  }

  return streak;
}

export type StreakStats = {
  current: number;
  best: number;
  completedDates: string[];
};

export async function getStreakStats(userId: string): Promise<StreakStats> {
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

  let cursorStr = currentChallengeDate();
  if (!completedDates.has(cursorStr)) {
    cursorStr = previousChallengeDate(cursorStr);
  }
  let current = 0;
  while (completedDates.has(cursorStr)) {
    current++;
    cursorStr = previousChallengeDate(cursorStr);
  }

  const sortedDates = [...completedDates].sort();
  let best = 0;
  let run = 0;
  let prevDate: string | null = null;
  for (const date of sortedDates) {
    run = prevDate && previousChallengeDate(date) === prevDate ? run + 1 : 1;
    best = Math.max(best, run);
    prevDate = date;
  }

  return { current, best, completedDates: sortedDates };
}
