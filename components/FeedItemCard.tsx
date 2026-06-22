"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Flag, Hand, MessageCircle } from "lucide-react";
import Avatar from "@/components/Avatar";
import {
  toggleClap,
  getClappers,
  getComments,
  addComment,
  reportCompletion,
  type Comment,
} from "@/app/actions/interactions";
import type { FeedItem } from "@/app/actions/completions";
import type { Profile } from "@/app/actions/friends";

const REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "inappropriate", label: "Inappropriate" },
  { value: "fake", label: "Fake / staged" },
  { value: "other", label: "Other" },
] as const;

function formatRelativeTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function FeedItemCard({
  item,
  isOwner = false,
}: {
  item: FeedItem;
  // your own post -- can't clap/comment/report yourself, so disable those instead of letting the tap fail
  isOwner?: boolean;
}) {
  const router = useRouter();
  const [clapped, setClapped] = useState(item.clappedByMe);
  const [clapsCount, setClapsCount] = useState(item.clapsCount);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [reported, setReported] = useState(false);
  const [reportMenuOpen, setReportMenuOpen] = useState(false);
  const [dotDismissed, setDotDismissed] = useState(false);
  const [clappers, setClappers] = useState<Profile[] | null>(null);
  const [clapperHover, setClapperHover] = useState(false);

  async function handleClap() {
    if (isOwner) return;
    setClapped((prev) => !prev);
    setClapsCount((prev) => (clapped ? prev - 1 : prev + 1));
    await toggleClap(item.completionId);
    setClappers(null); // stale once the count's changed, refetch next hover
  }

  async function openComments() {
    setCommentsOpen((prev) => !prev);
    setDotDismissed(true);
    if (!comments) {
      setComments(await getComments(item.completionId));
    }
  }

  async function handleClapperHover() {
    setClapperHover(true);
    if (!clappers) {
      setClappers(await getClappers(item.completionId));
    }
  }

  async function handleAddComment() {
    if (!commentDraft.trim()) return;
    setPosting(true);
    try {
      await addComment(item.completionId, commentDraft);
      setCommentDraft("");
      setComments(await getComments(item.completionId));
      router.refresh();
    } finally {
      setPosting(false);
    }
  }

  async function handleReport(reason: (typeof REPORT_REASONS)[number]["value"]) {
    if (reported) return;
    setReportMenuOpen(false);
    setReported(true);
    await reportCompletion(item.completionId, reason);
  }

  return (
    <div className="card relative">
      {item.isUnread && !dotDismissed && (
        <span className="absolute left-3 top-3 h-2.5 w-2.5 rounded-full bg-sage" />
      )}

      <div className="flex items-center gap-3">
        <Link href={`/u/${item.friend.handle}`}>
          <Avatar url={item.friend.avatar_url} size={36} />
        </Link>
        <div className="flex-1">
          <Link href={`/u/${item.friend.handle}`} className="font-medium text-ink">
            {item.friend.display_name || `@${item.friend.handle}`}
          </Link>
          <p className="text-xs text-ink-muted">
            {item.challengePrompt} · {formatRelativeTime(item.createdAt)}
          </p>
        </div>
        {!isOwner && (
          <div className="relative">
            <button
              onClick={() => setReportMenuOpen((prev) => !prev)}
              disabled={reported}
              aria-label="Report"
              className="text-ink-muted disabled:opacity-40"
            >
              <Flag size={16} strokeWidth={1.75} />
            </button>
            {reportMenuOpen && (
              <div className="absolute right-0 top-6 z-10 flex w-40 flex-col overflow-hidden rounded-xl border border-ink-muted/15 bg-white shadow-sm">
                {REPORT_REASONS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => handleReport(r.value)}
                    className="px-3 py-2 text-left text-xs text-ink hover:bg-paper"
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-3">
        {item.removed ? (
          <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-paper text-sm text-ink-muted">
            This photo was removed
          </div>
        ) : (
          <img
            src={item.photoUrl ?? undefined}
            alt={`${item.friend.handle}'s proof`}
            className="aspect-square w-full rounded-xl object-cover"
          />
        )}
      </div>

      {item.caption && <p className="mt-2 text-sm text-ink">{item.caption}</p>}

      <div className="mt-3 flex items-center gap-4 text-sm text-ink-muted">
        <div
          className="relative"
          onMouseEnter={clapsCount > 0 ? handleClapperHover : undefined}
          onMouseLeave={() => setClapperHover(false)}
        >
          <button
            onClick={handleClap}
            disabled={isOwner}
            className={`flex items-center gap-1.5 ${clapped ? "text-sun" : ""} ${
              isOwner ? "cursor-default" : ""
            }`}
          >
            <Hand size={18} strokeWidth={1.75} />
            {clapsCount > 0 && clapsCount}
          </button>
          {clapperHover && clapsCount > 0 && (
            <div className="absolute bottom-6 left-0 z-10 w-max max-w-48 rounded-xl border border-ink-muted/15 bg-white px-3 py-2 text-xs shadow-sm">
              {clappers === null ? (
                <span className="text-ink-muted">Loading...</span>
              ) : (
                <span className="text-ink">
                  {clappers.map((c) => c.display_name || `@${c.handle}`).join(", ")}
                </span>
              )}
            </div>
          )}
        </div>
        <button onClick={openComments} className="flex items-center gap-1.5">
          <MessageCircle size={18} strokeWidth={1.75} />
          {item.commentsCount > 0 && item.commentsCount}
        </button>
      </div>

      {commentsOpen && (
        <div className="mt-3 flex flex-col gap-2 border-t border-ink-muted/10 pt-3">
          {comments === null ? (
            <p className="text-xs text-ink-muted">Loading...</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-ink-muted">No comments yet.</p>
          ) : (
            comments.map((comment) => (
              <p key={comment.id} className="text-sm">
                <span className="font-medium text-ink">
                  {comment.author.display_name || `@${comment.author.handle}`}
                </span>{" "}
                <span className="text-ink-muted">{comment.body}</span>
              </p>
            ))
          )}
          {!isOwner && (
            <div className="mt-1 flex gap-2">
              <input
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                placeholder="Add a comment"
                maxLength={500}
                className="flex-1 rounded-xl border border-ink-muted/25 bg-white px-3 py-2 text-sm outline-none placeholder:text-ink-muted"
              />
              <button
                onClick={handleAddComment}
                disabled={posting || !commentDraft.trim()}
                className="btn-primary px-3 py-2 text-xs"
              >
                Post
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
