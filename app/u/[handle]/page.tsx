import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileByHandle, isFriendWith, getVisibleFriendsList, getMutualFriends } from "@/app/actions/friends";
import { getStreak, getUserCompletions } from "@/app/actions/completions";
import Avatar from "@/components/Avatar";
import FeedItemCard from "@/components/FeedItemCard";
import FriendPillList from "@/components/FriendPillList";
import AddFriendButton from "@/components/AddFriendButton";
import { Flame } from "lucide-react";

export default async function FriendProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
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

  const target = await getProfileByHandle(handle);

  if (!target) {
    return (
      <main className="app-shell flex items-center justify-center">
        <p className="text-ink-muted">No one with that handle.</p>
      </main>
    );
  }

  if (target.id === user.id) {
    redirect("/profile");
  }

  const isFriend = await isFriendWith(user.id, target.id);
  const [streak, posts, friendsList, mutuals] =
    isFriend && !target.banned
      ? await Promise.all([
          getStreak(target.id),
          getUserCompletions(target, user.id),
          target.show_friends_list ? getVisibleFriendsList(target.id) : Promise.resolve([]),
          getMutualFriends(target.id),
        ])
      : [0, [], [], []];

  return (
    <main className="app-shell">
      <div className="flex flex-col items-center gap-3">
        <Avatar url={target.avatar_url} size={88} />
        <div className="text-center">
          <h1 className="text-xl font-bold text-ink">
            {target.display_name || `@${target.handle}`}
          </h1>
          <p className="text-sm text-ink-muted">@{target.handle}</p>
        </div>
      </div>

      {target.banned ? (
        <p className="mt-8 text-center text-sm text-ink-muted">
          This account is no longer available.
        </p>
      ) : !isFriend ? (
        <div className="mt-8 flex flex-col items-center gap-3">
          <p className="text-sm text-ink-muted">
            Add them as a friend to see their streak and posts.
          </p>
          <AddFriendButton userId={target.id} />
        </div>
      ) : (
        <>
          <div className="mt-6 flex justify-center">
            <div className="flex items-center gap-1.5 rounded-lg bg-sun-soft px-3 py-1.5 text-sm font-medium text-sun">
              <Flame size={16} strokeWidth={1.75} />
              <span>{streak} day streak</span>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="section-label">Mutual friends</h2>
            {mutuals.length === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">No mutual friends yet.</p>
            ) : (
              <FriendPillList friends={mutuals} />
            )}
          </div>

          {target.show_friends_list && (
            <div className="mt-8">
              <h2 className="section-label">Friends</h2>
              {friendsList.length === 0 ? (
                <p className="mt-3 text-sm text-ink-muted">No friends yet.</p>
              ) : (
                <FriendPillList friends={friendsList} />
              )}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3">
            {posts.length === 0 ? (
              <p className="text-center text-sm text-ink-muted">No posts yet.</p>
            ) : (
              posts.map((item) => <FeedItemCard key={item.completionId} item={item} />)
            )}
          </div>
        </>
      )}
    </main>
  );
}
