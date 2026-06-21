"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ScanLine } from "lucide-react";
import Avatar from "@/components/Avatar";
import FeedItemCard from "@/components/FeedItemCard";
import AddFriendModal from "@/components/AddFriendModal";
import {
  searchProfilesByHandle,
  sendFriendRequest,
  respondToFriendRequest,
  type Profile,
  type Friendship,
} from "@/app/actions/friends";
import { markFeedSeen, type FeedItem, type FriendStatus } from "@/app/actions/completions";

type Props = {
  isAnonymous: boolean;
  myHandle: string;
  friends: Profile[];
  pendingRequests: (Friendship & { requester: Profile })[];
  friendStatuses: FriendStatus[];
  feed: FeedItem[];
};

export default function SocialTab({
  isAnonymous,
  myHandle,
  friends,
  pendingRequests,
  friendStatuses,
  feed,
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [scanOpen, setScanOpen] = useState(false);

  useEffect(() => {
    markFeedSeen();
  }, []);

  async function handleSearch(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      setResults(await searchProfilesByHandle(value));
    } finally {
      setSearching(false);
    }
  }

  async function handleAdd(id: string) {
    setSentTo((prev) => new Set(prev).add(id));
    await sendFriendRequest(id);
  }

  async function handleRespond(friendshipId: string, accept: boolean) {
    await respondToFriendRequest(friendshipId, accept);
    router.refresh();
  }

  const friendIds = new Set(friends.map((f) => f.id));

  return (
    <main className="flex h-dvh flex-col bg-paper px-6 pb-28 pt-10 text-ink">
      <h1 className="text-2xl font-bold text-ink">Social</h1>
      {isAnonymous && (
        <p className="mt-1 text-sm text-ink-muted">
          Sign in to get a handle your friends can actually find.
        </p>
      )}

      <div className="mt-5 flex min-h-0 flex-1 flex-col gap-6 md:flex-row md:gap-6">
        <section className="flex min-h-0 flex-1 flex-col overflow-y-auto md:basis-1/2 md:border-r md:border-ink-muted/15 md:pr-6">
          <div>
            <div className="flex gap-2">
              <input
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search by handle"
                className="flex-1 rounded-xl border border-ink-muted/25 bg-white px-4 py-2.5 text-sm outline-none placeholder:text-ink-muted"
              />
              <button
                onClick={() => setScanOpen(true)}
                aria-label="Scan a friend code"
                className="flex items-center justify-center rounded-xl border border-ink-muted/25 bg-white px-3 text-ink-muted"
              >
                <ScanLine size={18} strokeWidth={1.75} />
              </button>
            </div>
            {searching && <p className="mt-2 text-xs text-ink-muted">Searching...</p>}
            {results.length > 0 && (
              <ul className="mt-3 flex flex-col gap-2">
                {results.map((profile) => (
                  <li key={profile.id} className="card flex items-center justify-between py-3">
                    <Link href={`/u/${profile.handle}`} className="flex items-center gap-3">
                      <Avatar url={profile.avatar_url} />
                      <span className="font-medium text-ink">
                        {profile.display_name || `@${profile.handle}`}
                      </span>
                    </Link>
                    {friendIds.has(profile.id) ? (
                      <span className="text-xs text-ink-muted">Friends</span>
                    ) : sentTo.has(profile.id) ? (
                      <span className="text-xs text-ink-muted">Requested</span>
                    ) : (
                      <button
                        onClick={() => handleAdd(profile.id)}
                        className="btn-primary px-3 py-1 text-xs"
                      >
                        Add
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {pendingRequests.length > 0 && (
            <div className="mt-8">
              <h2 className="section-label">Requests</h2>
              <ul className="mt-3 flex flex-col gap-2">
                {pendingRequests.map((req) => (
                  <li key={req.id} className="card flex items-center justify-between py-3">
                    <Link href={`/u/${req.requester.handle}`} className="flex items-center gap-3">
                      <Avatar url={req.requester.avatar_url} />
                      <span className="font-medium text-ink">
                        {req.requester.display_name || `@${req.requester.handle}`}
                      </span>
                    </Link>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRespond(req.id, true)}
                        className="btn-primary px-3 py-1 text-xs"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleRespond(req.id, false)}
                        className="btn-ghost px-3 py-1 text-xs"
                      >
                        Decline
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8">
            <h2 className="section-label">Friends</h2>
            {friendStatuses.length === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">
                No friends yet — search for a handle above to add some.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {friendStatuses.map(({ friend, completedToday }) => (
                  <li key={friend.id} className="card flex items-center justify-between py-3">
                    <Link href={`/u/${friend.handle}`} className="flex items-center gap-3">
                      <Avatar url={friend.avatar_url} />
                      <span className="font-medium text-ink">
                        {friend.display_name || `@${friend.handle}`}
                      </span>
                    </Link>
                    {completedToday ? (
                      <span className="flex items-center gap-1 text-xs text-sage-dark">
                        <Check size={14} strokeWidth={2} />
                        Done
                      </span>
                    ) : (
                      <span className="text-xs text-ink-muted">Not yet</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="flex min-h-0 flex-1 flex-col overflow-y-auto border-t border-ink-muted/15 pt-6 md:basis-1/2 md:border-t-0 md:pt-0">
          <h2 className="section-label">Feed</h2>
          {feed.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">No one&rsquo;s completed a challenge yet.</p>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              {feed.map((item) => (
                <FeedItemCard key={item.completionId} item={item} />
              ))}
            </div>
          )}
        </section>
      </div>

      {scanOpen && (
        <AddFriendModal
          handle={myHandle}
          defaultTab="scan"
          onClose={() => setScanOpen(false)}
        />
      )}
    </main>
  );
}
