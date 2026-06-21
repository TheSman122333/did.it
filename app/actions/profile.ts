"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Profile } from "@/app/actions/friends";
import { assertNotBanned } from "@/lib/moderation";

export type MyProfile = Profile & {
  banned: boolean;
  allow_claps: boolean;
  allow_comments: boolean;
  show_friends_list: boolean;
};

const MY_PROFILE_COLUMNS =
  "id, handle, display_name, avatar_url, banned, allow_claps, allow_comments, show_friends_list";

export async function getMyProfile(userId: string): Promise<MyProfile> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(MY_PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (data) return data;

  // valid user but no profile row, happens if someone deletes it directly. self heal
  const fallbackHandle = userId.replace(/-/g, "").slice(0, 12);

  const { data: created, error: insertError } = await supabase
    .from("profiles")
    .insert({ id: userId, handle: fallbackHandle })
    .select(MY_PROFILE_COLUMNS)
    .single();

  if (insertError) throw insertError;
  return created;
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not logged in");
  await assertNotBanned(supabase, user.id);

  const displayName = formData.get("displayName");
  const avatar = formData.get("avatar");

  const updates: { display_name?: string | null; avatar_url?: string } = {};

  if (typeof displayName === "string") {
    const trimmed = displayName.trim();
    updates.display_name = trimmed.length > 0 ? trimmed : null;
  }

  if (avatar instanceof File && avatar.size > 0) {
    const avatarPath = `${user.id}/avatar.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(avatarPath, avatar, {
        contentType: avatar.type || "image/jpeg",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("avatars").getPublicUrl(avatarPath);
    // cache bust or the browser just keeps showing the old photo forever
    updates.avatar_url = `${data.publicUrl}?v=${Date.now()}`;
  }

  if (Object.keys(updates).length === 0) return;

  const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
  if (error) throw error;

  revalidatePath("/profile");
  revalidatePath("/social");
}

export async function updateInteractionSettings(allowClaps: boolean, allowComments: boolean) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not logged in");

  const { error } = await supabase
    .from("profiles")
    .update({ allow_claps: allowClaps, allow_comments: allowComments })
    .eq("id", user.id);

  if (error) throw error;
  revalidatePath("/profile");
}

export async function updateShowFriendsList(value: boolean) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not logged in");

  const { error } = await supabase
    .from("profiles")
    .update({ show_friends_list: value })
    .eq("id", user.id);

  if (error) throw error;
  revalidatePath("/profile");
}
