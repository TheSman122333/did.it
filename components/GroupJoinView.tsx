"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Globe } from "lucide-react";
import Avatar from "@/components/Avatar";
import { joinGroup, type Group } from "@/app/actions/groups";
import type { Profile } from "@/app/actions/friends";

export default function GroupJoinView({
  group,
  members,
}: {
  group: Group;
  members: Profile[];
}) {
  const router = useRouter();
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    setJoining(true);
    setError(null);
    try {
      await joinGroup(group.id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setJoining(false);
    }
  }

  return (
    <main className="app-shell">
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 pt-10 text-center">
        <Link href="/groups" aria-label="Back to groups" className="self-start text-ink-muted">
          <ArrowLeft size={26} strokeWidth={1.75} />
        </Link>

        <div className="flex flex-col items-center gap-2">
          <h1 className="text-2xl font-bold text-ink">{group.name}</h1>
          <span className="flex items-center gap-1.5 text-xs text-ink-muted">
            <Globe size={14} strokeWidth={1.75} />
            Public group · {members.length} {members.length === 1 ? "member" : "members"}
          </span>
        </div>

        {members.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {members.map((member) => (
              <span
                key={member.id}
                className="flex items-center gap-2 rounded-full border border-ink-muted/15 bg-white py-1 pl-1 pr-3 text-xs text-ink"
              >
                <Avatar url={member.avatar_url} size={24} />
                {member.display_name || `@${member.handle}`}
              </span>
            ))}
          </div>
        )}

        <p className="text-sm text-ink-muted">
          Join to see the group&rsquo;s daily challenge, prompt pool, and feed.
        </p>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button onClick={handleJoin} disabled={joining} className="btn-primary w-full py-3">
          {joining ? "Joining..." : "Join group"}
        </button>
      </div>
    </main>
  );
}
