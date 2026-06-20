import { createClient } from "@/lib/supabase/server";
import { getTodaysChallenge } from "@/app/actions/challenge";
import { getFriendsFeedForToday } from "@/app/actions/completions";
import { getMyFriends, getPendingRequests } from "@/app/actions/friends";
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

  const dailyChallenge = await getTodaysChallenge();
  const [friends, pendingRequests, feed] = await Promise.all([
    getMyFriends(user.id),
    getPendingRequests(user.id),
    getFriendsFeedForToday(user.id, dailyChallenge.id),
  ]);

  return (
    <SocialTab
      isAnonymous={user.is_anonymous ?? false}
      friends={friends}
      pendingRequests={pendingRequests}
      feed={feed}
    />
  );
}
