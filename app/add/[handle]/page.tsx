import Link from "next/link";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getProfileByHandle,
  getFriendshipStatus,
  sendFriendRequest,
} from "@/app/actions/friends";
import Avatar from "@/components/Avatar";

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

  if (target.id === user.id) {
    redirect("/profile");
  }

  const status = await getFriendshipStatus(user.id, target.id);
  if (status === "none") {
    await sendFriendRequest(target.id);
  }

  const message =
    status === "accepted"
      ? "You're already friends."
      : status === "pending"
        ? "Friend request already sent."
        : "Friend request sent.";

  return (
    <main className="app-shell flex flex-col items-center justify-center text-center">
      <Avatar url={target.avatar_url} size={88} />
      <h1 className="mt-4 text-xl font-bold text-ink">
        {target.display_name || `@${target.handle}`}
      </h1>
      <p className="mt-2 flex items-center gap-1.5 text-sm text-sage-dark">
        <Check size={16} strokeWidth={2} />
        {message}
      </p>
      <Link href={`/u/${target.handle}`} className="btn-primary mt-6 px-6 py-3">
        View profile
      </Link>
    </main>
  );
}
