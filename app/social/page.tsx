import { createClient } from "@/lib/supabase/server";
import { getTodaysChallenge } from "@/app/actions/challenge";
import { getFriendsFeed, getFriendsTodayStatus } from "@/app/actions/completions";
import { getMyFriends, getPendingRequests } from "@/app/actions/friends";
import { getMyProfile } from "@/app/actions/profile";
import SocialTab from "@/components/SocialTab";

export default async function SocialPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper">
        <p className="text-ink-muted">Loading...</p>
      </main>
    );
  }

  const [dailyChallenge, friends, pendingRequests, profile] = await Promise.all([
    getTodaysChallenge(),
    getMyFriends(user.id),
    getPendingRequests(user.id),
    getMyProfile(user.id),
  ]);

  const [friendStatuses, feed] = await Promise.all([
    getFriendsTodayStatus(friends, dailyChallenge.id),
    getFriendsFeed(user.id, friends),
  ]);

  return (
    <SocialTab
      isAnonymous={user.is_anonymous ?? false}
      myHandle={profile.handle}
      friends={friends}
      pendingRequests={pendingRequests}
      friendStatuses={friendStatuses}
      feed={feed}
    />
  );
}
