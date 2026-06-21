"use client";

import { useState } from "react";
import Link from "next/link";
import { Flame, Trophy, Settings, UserRoundPlus } from "lucide-react";
import Avatar from "@/components/Avatar";
import FriendPillList from "@/components/FriendPillList";
import FeedItemCard from "@/components/FeedItemCard";
import AddFriendModal from "@/components/AddFriendModal";
import StreakCalendar from "@/components/StreakCalendar";
import type { MyProfile } from "@/app/actions/profile";
import type { Profile } from "@/app/actions/friends";
import type { FeedItem, StreakStats } from "@/app/actions/completions";

export default function ProfileTab({
  profile,
  streakStats,
  friends,
  posts,
}: {
  profile: MyProfile;
  streakStats: StreakStats;
  friends: Profile[];
  posts: FeedItem[];
}) {
  const [addFriendOpen, setAddFriendOpen] = useState(false);

  return (
    <main className="app-shell relative">
      <div className="absolute right-6 top-8 flex flex-col items-center gap-3">
        <Link
          href="/profile/settings"
          aria-label="Settings"
          className="flex h-14 w-14 items-center justify-center rounded-full border border-ink-muted/15 bg-white text-ink-muted"
        >
          <Settings size={30} strokeWidth={1.75} />
        </Link>
        <button
          onClick={() => setAddFriendOpen(true)}
          aria-label="Add a friend"
          className="flex h-14 w-14 items-center justify-center rounded-full border border-ink-muted/15 bg-white text-ink-muted"
        >
          <UserRoundPlus size={30} strokeWidth={1.75} />
        </button>
      </div>

      <div className="flex flex-col items-center gap-3">
        <Avatar url={profile.avatar_url} size={88} />
        <div className="text-center">
          <h1 className="text-xl font-bold text-ink">
            {profile.display_name || `@${profile.handle}`}
          </h1>
          <p className="text-sm text-ink-muted">@{profile.handle}</p>
        </div>
      </div>

      {profile.banned && (
        <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-center text-sm text-red-700">
          Your account has been suspended for reported content.
        </p>
      )}

      <div className="mt-6 flex justify-center gap-3">
        <div className="flex items-center gap-1.5 rounded-lg bg-sun-soft px-3 py-1.5 text-sm font-medium text-sun">
          <Flame size={16} strokeWidth={1.75} />
          <span>{streakStats.current} day streak</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-sage-soft px-3 py-1.5 text-sm font-medium text-sage-dark">
          <Trophy size={16} strokeWidth={1.75} />
          <span>{streakStats.best} best</span>
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <StreakCalendar completedDates={streakStats.completedDates} />
      </div>

      <div className="mt-8">
        <h2 className="section-label">Friends</h2>
        {friends.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">No friends yet.</p>
        ) : (
          <FriendPillList friends={friends} />
        )}
      </div>

      <div className="mt-8 flex flex-col gap-3">
        {posts.length === 0 ? (
          <p className="text-center text-sm text-ink-muted">No posts yet.</p>
        ) : (
          posts.map((item) => <FeedItemCard key={item.completionId} item={item} isOwner />)
        )}
      </div>

      {addFriendOpen && (
        <AddFriendModal handle={profile.handle} onClose={() => setAddFriendOpen(false)} />
      )}
    </main>
  );
}
