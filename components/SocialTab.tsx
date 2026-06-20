"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "lucide-react";
import {
  searchProfilesByHandle,
  sendFriendRequest,
  respondToFriendRequest,
  type Profile,
  type Friendship,
} from "@/app/actions/friends";
import type { FeedItem } from "@/app/actions/completions";

type Props = {
  isAnonymous: boolean;
  friends: Profile[];
  pendingRequests: (Friendship & { requester: Profile })[];
  feed: FeedItem[];
};

export default function SocialTab({ isAnonymous, friends, pendingRequests, feed }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());

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
    <main className="app-shell">
      <h1 className="text-2xl font-bold text-ink">Social</h1>
      {isAnonymous && (
        <p className="mt-1 text-sm text-ink-muted">
          Sign in to get a handle your friends can actually find.
        </p>
      )}

      <div className="mt-6">
        <input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by handle"
          className="w-full rounded-xl border border-ink-muted/25 bg-white px-4 py-2.5 text-sm outline-none placeholder:text-ink-muted"
        />
        {searching && <p className="mt-2 text-xs text-ink-muted">Searching...</p>}
        {results.length > 0 && (
          <ul className="mt-3 flex flex-col gap-2">
            {results.map((profile) => (
              <li key={profile.id} className="card flex items-center justify-between py-3">
                <span className="font-medium text-ink">@{profile.handle}</span>
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
                <span className="font-medium text-ink">@{req.requester.handle}</span>
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
        {feed.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">
            No friends yet — search for a handle above to add some.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {feed.map((item) => (
              <li key={item.friend.id} className="card flex items-center gap-3">
                {item.photoUrl ? (
                  <img
                    src={item.photoUrl}
                    alt={`${item.friend.handle}'s proof`}
                    className="h-14 w-14 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-sky-soft text-sky">
                    <User size={22} strokeWidth={1.75} />
                  </div>
                )}
                <div>
                  <p className="font-medium text-ink">@{item.friend.handle}</p>
                  <p className="text-xs text-ink-muted">
                    {item.completedToday ? "Done for today" : "Hasn't done it yet"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
