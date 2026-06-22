"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { assertNotBanned } from "@/lib/moderation";

export type Profile = {
  id: string;
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
};

export type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  responded_at: string | null;
};

async function currentUserId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not logged in");
  return user.id;
}

export async function searchProfilesByHandle(query: string): Promise<Profile[]> {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);

  const trimmed = query.trim().toLowerCase();
  if (trimmed.length < 2) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, handle, display_name, avatar_url")
    .ilike("handle", `%${trimmed}%`)
    .neq("id", userId)
    .limit(10);

  if (error) throw error;
  return data ?? [];
}

export async function getProfileByHandle(
  handle: string
): Promise<(Profile & { banned: boolean; show_friends_list: boolean }) | null> {
  const supabase = await createClient();
  await currentUserId(supabase);

  const { data, error } = await supabase
    .from("profiles")
    .select("id, handle, display_name, avatar_url, banned, show_friends_list")
    .eq("handle", handle)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function sendFriendRequest(addresseeId: string) {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  await assertNotBanned(supabase, userId);

  const { error } = await supabase
    .from("friendships")
    .insert({ requester_id: userId, addressee_id: addresseeId });

  // already requested, fine either way
  if (error && error.code !== "23505") throw error;

  revalidatePath("/social");
}

export async function respondToFriendRequest(friendshipId: string, accept: boolean) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("friendships")
    .update({ status: accept ? "accepted" : "declined", responded_at: new Date().toISOString() })
    .eq("id", friendshipId);

  if (error) throw error;

  revalidatePath("/social");
}

export async function getMyFriends(userId: string): Promise<Profile[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("friendships")
    .select(
      "requester_id, addressee_id, requester:profiles!friendships_requester_id_fkey(id, handle, display_name, avatar_url), addressee:profiles!friendships_addressee_id_fkey(id, handle, display_name, avatar_url)"
    )
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (error) throw error;

  return (data ?? []).map((row) => {
    const requester = row.requester as unknown as Profile;
    const addressee = row.addressee as unknown as Profile;
    return row.requester_id === userId ? addressee : requester;
  });
}

// gated by their show_friends_list setting, enforced in get_user_friends()
export async function getVisibleFriendsList(targetId: string): Promise<Profile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_user_friends", { target_id: targetId });
  if (error) throw error;
  return (data ?? []) as Profile[];
}

// always visible, no toggle -- only ever reveals your own overlap with them
export async function getMutualFriends(targetId: string): Promise<Profile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_mutual_friends", { target_id: targetId });
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function getFriendshipStatus(
  viewerId: string,
  targetId: string
): Promise<"none" | "pending" | "accepted"> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("friendships")
    .select("status")
    .or(
      `and(requester_id.eq.${viewerId},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${viewerId})`
    )
    .limit(1);

  const row = data?.[0];
  if (!row) return "none";
  return row.status === "accepted" ? "accepted" : "pending";
}

export async function isFriendWith(viewerId: string, targetId: string): Promise<boolean> {
  if (viewerId === targetId) return true;
  const friends = await getMyFriends(viewerId);
  return friends.some((f) => f.id === targetId);
}

export async function getPendingRequests(userId: string): Promise<
  (Friendship & { requester: Profile })[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("friendships")
    .select("*, requester:profiles!friendships_requester_id_fkey(id, handle, display_name, avatar_url)")
    .eq("status", "pending")
    .eq("addressee_id", userId);

  if (error) throw error;
  return (data ?? []) as unknown as (Friendship & { requester: Profile })[];
}
