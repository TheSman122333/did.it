"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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

export async function sendFriendRequest(addresseeId: string) {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);

  const { error } = await supabase
    .from("friendships")
    .insert({ requester_id: userId, addressee_id: addresseeId });

  // Already requested (either direction) -- not a real failure.
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
