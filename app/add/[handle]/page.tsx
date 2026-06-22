import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileByHandle, getFriendshipStatus, sendFriendRequest } from "@/app/actions/friends";

export default async function AddFriendPage({
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

  if (target.id !== user.id) {
    const status = await getFriendshipStatus(user.id, target.id);
    if (status === "none") {
      await sendFriendRequest(target.id);
    }
  }

  redirect(`/u/${target.handle}`);
}
