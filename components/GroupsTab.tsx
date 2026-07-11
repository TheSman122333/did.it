"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Globe, Lock, Plus, UsersRound } from "lucide-react";
import Toggle from "@/components/Toggle";
import { createGroup, joinGroup, type GroupSummary } from "@/app/actions/groups";

export default function GroupsTab({
  groups,
  discover,
}: {
  groups: GroupSummary[];
  discover: GroupSummary[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  const atCap = groups.length >= 5;

  async function handleJoin(groupId: string) {
    setJoiningId(groupId);
    setJoinError(null);
    try {
      await joinGroup(groupId);
      router.push(`/groups/${groupId}`);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "Something went wrong");
      setJoiningId(null);
    }
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const groupId = await createGroup(name, isPublic);
      router.push(`/groups/${groupId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <main className="app-shell">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-ink">Groups</h1>
          {!atCap && (
            <button
              onClick={() => setCreating((prev) => !prev)}
              aria-label="New group"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-ink-muted/15 bg-white text-ink-muted"
            >
              <Plus size={22} strokeWidth={1.75} />
            </button>
          )}
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          {atCap
            ? "You're in 5 groups, the max. Leave one to make or join another."
            : "A crew with its own daily challenge, drawn from prompts you all write."}
        </p>

        {creating && (
          <div className="card mt-5 flex flex-col gap-4 p-5">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Group name"
              maxLength={40}
              className="rounded-xl border border-ink-muted/25 bg-white px-4 py-2.5 text-sm outline-none placeholder:text-ink-muted"
            />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-ink">Public group</p>
                <p className="text-xs text-ink-muted">
                  Public groups&rsquo; challenges have a tiny chance of joining everyone&rsquo;s
                  daily draw.
                </p>
              </div>
              <Toggle checked={isPublic} onChange={setIsPublic} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              onClick={handleCreate}
              disabled={submitting || !name.trim()}
              className="btn-primary py-2.5 text-sm"
            >
              {submitting ? "Creating..." : "Create group"}
            </button>
          </div>
        )}

        {groups.length === 0 && !creating ? (
          <div className="mt-16 flex flex-col items-center gap-3 text-center">
            <UsersRound size={40} strokeWidth={1.25} className="text-ink-muted" />
            <p className="text-sm text-ink-muted">
              No groups yet. Make one and pull your friends in, or join one below.
            </p>
          </div>
        ) : (
          <ul className="mt-6 flex flex-col gap-3">
            {groups.map((group) => (
              <li key={group.id}>
                <Link href={`/groups/${group.id}`} className="card flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium text-ink">{group.name}</p>
                    <p className="text-xs text-ink-muted">
                      {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
                    </p>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                    {group.is_public ? (
                      <>
                        <Globe size={14} strokeWidth={1.75} />
                        Public
                      </>
                    ) : (
                      <>
                        <Lock size={14} strokeWidth={1.75} />
                        Private
                      </>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-10">
          <h2 className="section-label">Discover</h2>
          <p className="mt-1 text-xs text-ink-muted">Public groups anyone can join.</p>
          {joinError && <p className="mt-2 text-sm text-red-600">{joinError}</p>}
          {discover.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">
              No public groups to join right now. You&rsquo;re either in them all, or nobody&rsquo;s
              made one yet.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {discover.map((group) => (
                <li key={group.id} className="card flex items-center justify-between py-4">
                  <Link href={`/groups/${group.id}`} className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{group.name}</p>
                    <p className="text-xs text-ink-muted">
                      {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
                    </p>
                  </Link>
                  <button
                    onClick={() => handleJoin(group.id)}
                    disabled={joiningId !== null || atCap}
                    className="btn-primary shrink-0 px-4 py-1.5 text-xs disabled:opacity-40"
                  >
                    {joiningId === group.id ? "Joining..." : "Join"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
