import { createClient } from "@/lib/supabase/server";
import { getTodaysChallenge } from "@/app/actions/challenge";
import { getFriendsFeed, getFriendsTodayStatus } from "@/app/actions/completions";
import {
  getMyFriends,
  getPendingRequests,
  getDiscoverFeed,
  type DiscoverPerson,
} from "@/app/actions/friends";
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

  // only fetched for friendless accounts, and never allowed to sink the page
  let discover: DiscoverPerson[] = [];
  if (friends.length === 0) {
    try {
      discover = await getDiscoverFeed();
    } catch {
      discover = [];
    }
  }

  return (
    <SocialTab
      isAnonymous={user.is_anonymous ?? false}
      myHandle={profile.handle}
      friends={friends}
      pendingRequests={pendingRequests}
      friendStatuses={friendStatuses}
      feed={feed}
      discover={discover}
    />
  );
}
