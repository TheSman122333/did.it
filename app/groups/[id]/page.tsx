import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  getGroup,
  getGroupMembers,
  getGroupPrompts,
  getTodaysGroupChallenge,
} from "@/app/actions/groups";
import { getGroupFeed, getMyCompletionForToday } from "@/app/actions/completions";
import { getMyFriends } from "@/app/actions/friends";
import GroupDetailTab from "@/components/GroupDetailTab";
import GroupJoinView from "@/components/GroupJoinView";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const group = await getGroup(id);

  // non-members get nothing back from RLS, same as a bad id
  if (!group) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper px-6 text-center">
        <p className="text-ink-muted">This group doesn&rsquo;t exist, or you&rsquo;re not in it.</p>
        <Link href="/groups" className="btn-secondary">
          Back to Groups
        </Link>
      </main>
    );
  }

  // non-members of a public group get a join screen, not the content --
  // prompts/feed/photos stay member-only regardless of visibility
  const members = await getGroupMembers(id);
  const isMember = members.some((m) => m.id === user.id);
  if (!isMember) {
    return <GroupJoinView group={group} members={members} />;
  }

  const [prompts, todaysChallenge, friends] = await Promise.all([
    getGroupPrompts(id),
    getTodaysGroupChallenge(id),
    getMyFriends(user.id),
  ]);

  const [feed, myCompletion] = await Promise.all([
    getGroupFeed(user.id, id, members),
    todaysChallenge
      ? getMyCompletionForToday(user.id, todaysChallenge.id)
      : Promise.resolve(null),
  ]);

  return (
    <GroupDetailTab
      group={group}
      members={members}
      prompts={prompts}
      todaysChallenge={todaysChallenge}
      completedToday={Boolean(myCompletion)}
      feed={feed}
      friends={friends}
      viewerId={user.id}
    />
  );
}
