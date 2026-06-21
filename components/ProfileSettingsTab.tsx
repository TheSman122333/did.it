"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User } from "lucide-react";
import {
  updateProfile,
  updateInteractionSettings,
  updateShowFriendsList,
  type MyProfile,
} from "@/app/actions/profile";
import AuthButton from "@/components/AuthButton";
import Toggle from "@/components/Toggle";
import PushNotificationToggle from "@/components/PushNotificationToggle";

export default function ProfileSettingsTab({
  profile,
  isAnonymous,
}: {
  profile: MyProfile;
  isAnonymous: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allowClaps, setAllowClaps] = useState(profile.allow_claps);
  const [allowComments, setAllowComments] = useState(profile.allow_comments);
  const [showFriendsList, setShowFriendsList] = useState(profile.show_friends_list);

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

  async function handleToggleClaps(next: boolean) {
    setAllowClaps(next);
    await updateInteractionSettings(next, allowComments);
  }

  async function handleToggleComments(next: boolean) {
    setAllowComments(next);
    await updateInteractionSettings(allowClaps, next);
  }

  async function handleToggleShowFriendsList(next: boolean) {
    setShowFriendsList(next);
    await updateShowFriendsList(next);
  }

  const avatarSrc = avatarPreview ?? profile.avatar_url;

  return (
    <main className="app-shell">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center gap-4">
          <Link href="/profile" aria-label="Back to profile" className="text-ink-muted">
            <ArrowLeft size={26} strokeWidth={1.75} />
          </Link>
          <h1 className="text-3xl font-bold text-ink">Settings</h1>
        </div>

        {profile.banned && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-base text-red-700">
            Your account has been suspended for reported content.
          </p>
        )}

        <div className="mt-10 flex flex-col items-center gap-4">
          <label className="relative h-36 w-36 cursor-pointer rounded-full">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt="Your avatar"
                className="h-36 w-36 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-36 w-36 items-center justify-center rounded-full bg-sky-soft text-sky">
                <User size={48} strokeWidth={1.75} />
              </div>
            )}
            <span className="absolute inset-x-0 bottom-0 rounded-full bg-ink/60 py-1.5 text-center text-sm font-medium text-white">
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
          <p className="text-base text-ink-muted">@{profile.handle}</p>
        </div>

        <div className="mt-10 flex flex-col gap-3">
          <label className="section-label" htmlFor="displayName">
            Display name
          </label>
          <input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Add a display name"
            maxLength={40}
            className="rounded-xl border border-ink-muted/25 bg-white px-5 py-4 text-base outline-none placeholder:text-ink-muted"
          />
        </div>

        {error && <p className="mt-4 text-base text-red-600">{error}</p>}

        <button onClick={handleSave} disabled={saving} className="btn-primary mt-8 w-full py-4 text-base">
          {saving ? "Saving..." : "Save"}
        </button>

        <div className="mt-12 flex flex-col gap-5">
          <h2 className="section-label">Who can interact with your posts</h2>
          <div className="card flex items-center justify-between p-5">
            <span className="text-base text-ink">Friends can clap</span>
            <Toggle checked={allowClaps} onChange={handleToggleClaps} />
          </div>
          <div className="card flex items-center justify-between p-5">
            <span className="text-base text-ink">Friends can comment</span>
            <Toggle checked={allowComments} onChange={handleToggleComments} />
          </div>
          <div className="card flex items-center justify-between p-5">
            <span className="text-base text-ink">Show my friends list on my profile</span>
            <Toggle checked={showFriendsList} onChange={handleToggleShowFriendsList} />
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-5">
          <h2 className="section-label">Notifications</h2>
          <PushNotificationToggle />
        </div>

        <div className="mt-12 flex justify-center">
          <AuthButton isAnonymous={isAnonymous} />
        </div>
      </div>
    </main>
  );
}
