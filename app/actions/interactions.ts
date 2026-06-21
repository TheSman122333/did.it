"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import type { Profile } from "@/app/actions/friends";
import { notifyUsers } from "@/lib/push";

export type Comment = {
  id: string;
  completionId: string;
  body: string;
  createdAt: string;
  author: Profile;
};

async function currentUserId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not logged in");
  return user.id;
}

async function actorName(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("handle, display_name")
    .eq("id", userId)
    .maybeSingle();
  return data?.display_name || (data ? `@${data.handle}` : "Someone");
}

async function completionOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  completionId: string
) {
  const { data } = await supabase
    .from("completions")
    .select("user_id")
    .eq("id", completionId)
    .maybeSingle();
  return data?.user_id ?? null;
}

// toggles, returns the new state so the client doesn't have to guess
export async function toggleClap(completionId: string): Promise<boolean> {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);

  const { data: existing } = await supabase
    .from("claps")
    .select("id")
    .eq("completion_id", completionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("claps").delete().eq("id", existing.id);
    if (error) throw error;
    revalidatePath("/social");
    return false;
  }

  const { error } = await supabase
    .from("claps")
    .insert({ completion_id: completionId, user_id: userId });
  if (error) throw error;

  const ownerId = await completionOwner(supabase, completionId);
  if (ownerId && ownerId !== userId) {
    const name = await actorName(supabase, userId);
    // fires after the response, the clap shouldn't wait on a push api call
    after(() =>
      notifyUsers(supabase, [ownerId], {
        title: "did.it",
        body: `${name} clapped on your post`,
        url: "/social",
      })
    );
  }

  revalidatePath("/social");
  return true;
}

export async function getClappers(completionId: string): Promise<Profile[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("claps")
    .select("clapper:profiles(id, handle, display_name, avatar_url)")
    .eq("completion_id", completionId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => row.clapper as unknown as Profile);
}

export async function getComments(completionId: string): Promise<Comment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("comments")
    .select(
      "id, completion_id, body, created_at, author:profiles(id, handle, display_name, avatar_url)"
    )
    .eq("completion_id", completionId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    completionId: row.completion_id,
    body: row.body,
    createdAt: row.created_at,
    author: row.author as unknown as Profile,
  }));
}

export async function addComment(completionId: string, body: string) {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);

  const trimmed = body.trim();
  if (trimmed.length === 0) throw new Error("Comment can't be empty");
  if (trimmed.length > 500) throw new Error("Comment is too long");

  const { error } = await supabase
    .from("comments")
    .insert({ completion_id: completionId, user_id: userId, body: trimmed });

  if (error) throw error;

  const ownerId = await completionOwner(supabase, completionId);
  if (ownerId && ownerId !== userId) {
    const name = await actorName(supabase, userId);
    after(() =>
      notifyUsers(supabase, [ownerId], {
        title: "did.it",
        body: `${name}: ${trimmed.slice(0, 80)}`,
        url: "/social",
      })
    );
  }

  revalidatePath("/social");
}

export async function deleteComment(commentId: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("comments").delete().eq("id", commentId);
  if (error) throw error;
  revalidatePath("/social");
}

export async function reportCompletion(completionId: string, reason?: string) {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);

  // RLS enforces this too, this just gives a real error message first
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const { data: recent } = await supabase
    .from("reports")
    .select("id")
    .eq("reporter_id", userId)
    .gt("created_at", twoHoursAgo)
    .limit(1);

  if (recent && recent.length > 0) {
    throw new Error("You can only report once every 2 hours.");
  }

  const { error } = await supabase.from("reports").insert({
    completion_id: completionId,
    reporter_id: userId,
    reason: reason?.trim() || null,
  });

  // already reported, fine
  if (error && error.code !== "23505") throw error;

  revalidatePath("/social");
}
