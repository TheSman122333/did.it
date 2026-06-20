"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Profile } from "@/app/actions/friends";

export async function getMyProfile(userId: string): Promise<Profile> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, handle, display_name, avatar_url")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not logged in");

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
    // Cache-bust: the path is stable across re-uploads, so without this the
    // browser (and any CDN) would keep serving the old cached image.
    updates.avatar_url = `${data.publicUrl}?v=${Date.now()}`;
  }

  if (Object.keys(updates).length === 0) return;

  const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
  if (error) throw error;

  revalidatePath("/profile");
  revalidatePath("/social");
}
