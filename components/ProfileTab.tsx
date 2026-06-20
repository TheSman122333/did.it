"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "lucide-react";
import { updateProfile } from "@/app/actions/profile";
import AuthButton from "@/components/AuthButton";
import type { Profile } from "@/app/actions/friends";

export default function ProfileTab({
  profile,
  isAnonymous,
}: {
  profile: Profile;
  isAnonymous: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setAvatarFile(selected);
    setAvatarPreview(URL.createObjectURL(selected));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("displayName", displayName);
      if (avatarFile) formData.set("avatar", avatarFile);
      await updateProfile(formData);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const avatarSrc = avatarPreview ?? profile.avatar_url;

  return (
    <main className="app-shell">
      <h1 className="text-2xl font-bold text-ink">Profile</h1>

      <div className="mt-6 flex flex-col items-center gap-3">
        <label className="relative h-24 w-24 cursor-pointer rounded-full">
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt="Your avatar"
              className="h-24 w-24 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-sky-soft text-sky">
              <User size={36} strokeWidth={1.75} />
            </div>
          )}
          <span className="absolute inset-x-0 bottom-0 rounded-full bg-ink/60 py-1 text-center text-xs font-medium text-white">
            Change
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </label>
        <p className="text-sm text-ink-muted">@{profile.handle}</p>
      </div>

      <div className="mt-8 flex flex-col gap-2">
        <label className="section-label" htmlFor="displayName">
          Display name
        </label>
        <input
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Add a display name"
          maxLength={40}
          className="rounded-xl border border-ink-muted/25 bg-white px-4 py-2.5 text-sm outline-none placeholder:text-ink-muted"
        />
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button onClick={handleSave} disabled={saving} className="btn-primary mt-6 w-full">
        {saving ? "Saving..." : "Save"}
      </button>

      <div className="mt-10 flex justify-center">
        <AuthButton isAnonymous={isAnonymous} />
      </div>
    </main>
  );
}
