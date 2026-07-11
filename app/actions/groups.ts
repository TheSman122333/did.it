"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { currentChallengeDate } from "@/lib/challengeDate";
import { assertNotBanned } from "@/lib/moderation";
import type { Profile } from "@/app/actions/friends";
import type { DailyChallenge } from "@/app/actions/challenge";

export type Group = {
  id: string;
  owner_id: string;
  name: string;
  is_public: boolean;
  created_at: string;
};

export type GroupSummary = Group & { memberCount: number };

export type GroupPrompt = {
  id: string;
  prompt: string;
  active: boolean;
  removed: boolean;
  created_by: string | null;
  author: Pick<Profile, "handle" | "display_name"> | null;
};

const MAX_GROUPS = 5;

async function currentUserId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not logged in");
  return user.id;
}

// RLS is the hard gate (0041), this just produces a readable message first
async function assertUnderGroupCap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { count } = await supabase
    .from("group_members")
    .select("group_id", { count: "exact", head: true })
    .eq("user_id", userId);

  if ((count ?? 0) >= MAX_GROUPS) {
    throw new Error(`You can only be in ${MAX_GROUPS} groups at once.`);
  }
}

export async function createGroup(name: string, isPublic: boolean): Promise<string> {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  await assertNotBanned(supabase, userId);
  await assertUnderGroupCap(supabase, userId);

  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 40) {
    throw new Error("Group name must be 1-40 characters");
  }

  const { data: group, error } = await supabase
    .from("groups")
    .insert({ owner_id: userId, name: trimmed, is_public: isPublic })
    .select("id")
    .single();

  if (error || !group) throw error ?? new Error("Failed to create group");

  const { error: memberError } = await supabase
    .from("group_members")
    .insert({ group_id: group.id, user_id: userId });

  // a group without its owner in the roster is broken, don't leave it behind
  if (memberError) {
    await supabase.from("groups").delete().eq("id", group.id);
    throw memberError;
  }

  revalidatePath("/groups");
  return group.id;
}

type GroupSummaryRow = Group & { group_members: { count: number }[] };

function toGroupSummary(row: GroupSummaryRow): GroupSummary {
  return {
    id: row.id,
    owner_id: row.owner_id,
    name: row.name,
    is_public: row.is_public,
    created_at: row.created_at,
    memberCount: row.group_members?.[0]?.count ?? 0,
  };
}

// via the membership table, not a bare groups select -- public groups are
// visible to everyone now, so "my groups" has to mean "groups I'm in"
export async function getMyGroups(): Promise<GroupSummary[]> {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);

  const { data, error } = await supabase
    .from("group_members")
    .select("group:groups(*, group_members(count))")
    .eq("user_id", userId);

  if (error) throw error;

  return (data ?? [])
    .map((row) => toGroupSummary(row.group as unknown as GroupSummaryRow))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

// random public groups the caller isn't in, for the discover section
export async function getDiscoverGroups(limit = 6): Promise<GroupSummary[]> {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);

  const [{ data: publicGroups, error }, { data: myMemberships }] = await Promise.all([
    supabase
      .from("groups")
      .select("*, group_members(count)")
      .eq("is_public", true)
      .limit(30),
    supabase.from("group_members").select("group_id").eq("user_id", userId),
  ]);

  if (error) throw error;

  const myGroupIds = new Set((myMemberships ?? []).map((m) => m.group_id));
  const candidates = ((publicGroups ?? []) as GroupSummaryRow[]).filter(
    (g) => !myGroupIds.has(g.id)
  );

  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  return candidates.slice(0, limit).map(toGroupSummary);
}

export async function joinGroup(groupId: string) {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  await assertNotBanned(supabase, userId);
  await assertUnderGroupCap(supabase, userId);

  const { error } = await supabase
    .from("group_members")
    .insert({ group_id: groupId, user_id: userId });

  // already in, fine
  if (error && error.code !== "23505") throw error;
  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
}

export async function getGroup(groupId: string): Promise<Group | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getGroupMembers(groupId: string): Promise<Profile[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("group_members")
    .select("profile:profiles(id, handle, display_name, avatar_url)")
    .eq("group_id", groupId)
    .order("added_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => row.profile as unknown as Profile);
}

export async function addGroupMember(groupId: string, userId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("group_members")
    .insert({ group_id: groupId, user_id: userId });

  if (error) {
    // already in the group, fine
    if (error.code === "23505") return;
    // RLS rejection: the cap on THEIR membership count is the one condition
    // the owner can't pre-check, so surface it readably
    if (error.code === "42501") {
      throw new Error("Couldn't add them. They may already be in 5 groups.");
    }
    throw error;
  }
  revalidatePath(`/groups/${groupId}`);
}

export async function removeGroupMember(groupId: string, userId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);

  if (error) throw error;
  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/groups");
}

export async function setGroupPublic(groupId: string, isPublic: boolean) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("groups")
    .update({ is_public: isPublic })
    .eq("id", groupId);

  if (error) throw error;
  revalidatePath(`/groups/${groupId}`);
}

export async function deleteGroup(groupId: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("groups").delete().eq("id", groupId);
  if (error) throw error;
  revalidatePath("/groups");
}

export async function addGroupPrompt(groupId: string, prompt: string) {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  await assertNotBanned(supabase, userId);

  const trimmed = prompt.trim();
  if (trimmed.length < 1 || trimmed.length > 120) {
    throw new Error("Prompt must be 1-120 characters");
  }

  // active must be false explicitly: the column default is true for the
  // system pool, and the insert policy rejects active group prompts
  const { error } = await supabase.from("challenges").insert({
    group_id: groupId,
    created_by: userId,
    prompt: trimmed,
    active: false,
  });

  if (error) throw error;
  revalidatePath(`/groups/${groupId}`);
}

export async function getGroupPrompts(groupId: string): Promise<GroupPrompt[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("challenges")
    .select("id, prompt, active, removed, created_by, author:profiles(handle, display_name)")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as GroupPrompt[];
}

// same lazy-create shape as getTodaysChallenge, but scoped to one group's
// own prompt pool. null when the group has no usable prompts yet.
export async function getTodaysGroupChallenge(groupId: string): Promise<DailyChallenge | null> {
  const supabase = await createClient();
  const date = currentChallengeDate();

  const { data: existing, error: fetchError } = await supabase
    .from("daily_challenges")
    .select("*")
    .eq("date", date)
    .eq("group_id", groupId)
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
    .eq("group_id", groupId)
    .eq("removed", false);

  if (poolError) throw poolError;
  if (!pool || pool.length === 0) return null;

  const picked = pool[Math.floor(Math.random() * pool.length)];

  const { data: inserted, error: insertError } = await supabase
    .from("daily_challenges")
    .insert({ challenge_id: picked.id, date, group_id: groupId })
    .select("*")
    .single();

  // someone else in the group already created today's row, just refetch
  if (insertError?.code === "23505") {
    return getTodaysGroupChallenge(groupId);
  }

  if (insertError || !inserted) {
    throw insertError ?? new Error("Failed to create today's group challenge");
  }

  return { ...inserted, challenge: picked };
}
