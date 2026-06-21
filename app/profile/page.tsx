import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/app/actions/profile";
import { getMyFriends } from "@/app/actions/friends";
import { getStreakStats, getUserCompletions } from "@/app/actions/completions";
import ProfileTab from "@/components/ProfileTab";

export default async function ProfilePage() {
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

  const profile = await getMyProfile(user.id);
  const [streakStats, friends, posts] = await Promise.all([
    getStreakStats(user.id),
    getMyFriends(user.id),
    getUserCompletions(profile, user.id),
  ]);

  return (
    <ProfileTab profile={profile} streakStats={streakStats} friends={friends} posts={posts} />
  );
}
