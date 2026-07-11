"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Flag,
  Globe,
  Lock,
  Sparkles,
  UserRoundPlus,
  X,
} from "lucide-react";
import Avatar from "@/components/Avatar";
import CameraCapture from "@/components/CameraCapture";
import FeedItemCard from "@/components/FeedItemCard";
import Toggle from "@/components/Toggle";
import {
  addGroupMember,
  addGroupPrompt,
  deleteGroup,
  removeGroupMember,
  setGroupPublic,
  type Group,
  type GroupPrompt,
} from "@/app/actions/groups";
import { reportChallenge } from "@/app/actions/interactions";
import type { DailyChallenge } from "@/app/actions/challenge";
import type { FeedItem } from "@/app/actions/completions";
import type { Profile } from "@/app/actions/friends";

const REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "inappropriate", label: "Inappropriate" },
  { value: "fake", label: "Fake / staged" },
  { value: "other", label: "Other" },
] as const;

export default function GroupDetailTab({
  group,
  members,
  prompts,
  todaysChallenge,
  completedToday,
  feed,
  friends,
  viewerId,
}: {
  group: Group;
  members: Profile[];
  prompts: GroupPrompt[];
  todaysChallenge: DailyChallenge | null;
  completedToday: boolean;
  feed: FeedItem[];
  friends: Profile[];
  viewerId: string;
}) {
  const router = useRouter();
  const isOwner = group.owner_id === viewerId;

  const [isPublic, setIsPublic] = useState(group.is_public);
  const [addingMember, setAddingMember] = useState(false);
  const [promptDraft, setPromptDraft] = useState("");
  const [promptError, setPromptError] = useState<string | null>(null);
  const [submittingPrompt, setSubmittingPrompt] = useState(false);
  const [reportMenuOpen, setReportMenuOpen] = useState(false);
  const [reported, setReported] = useState(false);

  const memberIds = new Set(members.map((m) => m.id));
  const addableFriends = friends.filter((f) => !memberIds.has(f.id));

  async function handleTogglePublic(next: boolean) {
    setIsPublic(next);
    await setGroupPublic(group.id, next);
  }

  async function handleAddMember(userId: string) {
    await addGroupMember(group.id, userId);
    router.refresh();
  }

  async function handleRemoveMember(userId: string) {
    await removeGroupMember(group.id, userId);
    if (userId === viewerId) {
      router.push("/groups");
    } else {
      router.refresh();
    }
  }

  async function handleDeleteGroup() {
    if (!confirm(`Delete "${group.name}"? This removes its challenges and feed for everyone.`)) {
      return;
    }
    await deleteGroup(group.id);
    router.push("/groups");
  }

  async function handleAddPrompt() {
    if (!promptDraft.trim()) return;
    setSubmittingPrompt(true);
    setPromptError(null);
    try {
      await addGroupPrompt(group.id, promptDraft);
      setPromptDraft("");
      router.refresh();
    } catch (err) {
      setPromptError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmittingPrompt(false);
    }
  }

  async function handleReportChallenge(reason: (typeof REPORT_REASONS)[number]["value"]) {
    if (reported || !todaysChallenge) return;
    setReportMenuOpen(false);
    setReported(true);
    await reportChallenge(todaysChallenge.challenge.id, reason);
  }

  const challengeRemoved = todaysChallenge?.challenge.removed ?? false;
  const isChallengeAuthor = todaysChallenge?.challenge.created_by === viewerId;

  return (
    <main className="app-shell">
      <div className="mx-auto w-full max-w-2xl pb-10">
        <div className="flex items-center gap-4">
          <Link href="/groups" aria-label="Back to groups" className="text-ink-muted">
            <ArrowLeft size={26} strokeWidth={1.75} />
          </Link>
          <h1 className="flex-1 truncate text-2xl font-bold text-ink">{group.name}</h1>
          <span className="flex items-center gap-1.5 text-xs text-ink-muted">
            {isPublic ? (
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
        </div>

        {/* members */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="section-label">Members</h2>
            {isOwner && addableFriends.length > 0 && (
              <button
                onClick={() => setAddingMember((prev) => !prev)}
                aria-label="Add a member"
                className="text-ink-muted"
              >
                <UserRoundPlus size={18} strokeWidth={1.75} />
              </button>
            )}
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {members.map((member) => (
              <li key={member.id} className="card flex items-center justify-between py-2.5">
                <Link href={`/u/${member.handle}`} className="flex items-center gap-3">
                  <Avatar url={member.avatar_url} size={32} />
                  <span className="text-sm font-medium text-ink">
                    {member.display_name || `@${member.handle}`}
                    {member.id === group.owner_id && (
                      <span className="ml-2 text-xs font-normal text-ink-muted">owner</span>
                    )}
                  </span>
                </Link>
                {(isOwner && member.id !== viewerId) || (!isOwner && member.id === viewerId) ? (
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    aria-label={member.id === viewerId ? "Leave group" : "Remove member"}
                    className="text-xs text-ink-muted"
                  >
                    {member.id === viewerId ? "Leave" : <X size={16} strokeWidth={1.75} />}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>

          {addingMember && addableFriends.length > 0 && (
            <div className="card mt-3 flex flex-col gap-2 p-4">
              <p className="text-xs text-ink-muted">Add from your friends</p>
              {addableFriends.map((friend) => (
                <div key={friend.id} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-ink">
                    <Avatar url={friend.avatar_url} size={28} />
                    {friend.display_name || `@${friend.handle}`}
                  </span>
                  <button
                    onClick={() => handleAddMember(friend.id)}
                    className="btn-primary px-3 py-1 text-xs"
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* today's group challenge */}
        <div className="mt-8">
          <h2 className="section-label">Today&rsquo;s Group Challenge</h2>
          {!todaysChallenge ? (
            <p className="mt-3 text-sm text-ink-muted">
              No prompts in the pool yet. Add one below to start the daily draw.
            </p>
          ) : challengeRemoved ? (
            <p className="mt-3 rounded-xl bg-paper px-4 py-3 text-sm text-ink-muted">
              Today&rsquo;s challenge was removed after reports. A new one gets drawn tomorrow.
            </p>
          ) : (
            <div className="card mt-3 flex flex-col items-center gap-4 p-5 text-center">
              <div className="flex w-full items-start justify-between gap-2">
                <p className="flex-1 text-lg font-bold text-ink">
                  {todaysChallenge.challenge.prompt}
                </p>
                {!isChallengeAuthor && (
                  <div className="relative">
                    <button
                      onClick={() => setReportMenuOpen((prev) => !prev)}
                      disabled={reported}
                      aria-label="Report this challenge"
                      className="text-ink-muted disabled:opacity-40"
                    >
                      <Flag size={16} strokeWidth={1.75} />
                    </button>
                    {reportMenuOpen && (
                      <div className="absolute right-0 top-6 z-10 flex w-40 flex-col overflow-hidden rounded-xl border border-ink-muted/15 bg-white shadow-sm">
                        {REPORT_REASONS.map((r) => (
                          <button
                            key={r.value}
                            onClick={() => handleReportChallenge(r.value)}
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
              {completedToday ? (
                <p className="flex items-center gap-1.5 font-medium text-sage-dark">
                  <Check size={18} strokeWidth={2} />
                  Done for today
                </p>
              ) : (
                <CameraCapture dailyChallengeId={todaysChallenge.id} />
              )}
            </div>
          )}
        </div>

        {/* prompt pool */}
        <div className="mt-8">
          <h2 className="section-label">Prompt Pool</h2>
          <div className="mt-3 flex gap-2">
            <input
              value={promptDraft}
              onChange={(e) => setPromptDraft(e.target.value)}
              placeholder="Add a challenge idea"
              maxLength={120}
              className="flex-1 rounded-xl border border-ink-muted/25 bg-white px-4 py-2.5 text-sm outline-none placeholder:text-ink-muted"
            />
            <button
              onClick={handleAddPrompt}
              disabled={submittingPrompt || !promptDraft.trim()}
              className="btn-primary px-4 py-2 text-sm"
            >
              Add
            </button>
          </div>
          {promptError && <p className="mt-2 text-sm text-red-600">{promptError}</p>}
          {prompts.length > 0 && (
            <ul className="mt-3 flex flex-col gap-2">
              {prompts.map((prompt) => (
                <li
                  key={prompt.id}
                  className={`card flex items-center justify-between py-2.5 ${
                    prompt.removed ? "opacity-50" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className={`truncate text-sm text-ink ${prompt.removed ? "line-through" : ""}`}>
                      {prompt.prompt}
                    </p>
                    <p className="text-xs text-ink-muted">
                      by {prompt.author?.display_name || `@${prompt.author?.handle ?? "unknown"}`}
                    </p>
                  </div>
                  {prompt.active && (
                    <span className="flex shrink-0 items-center gap-1 rounded-lg bg-sun-soft px-2 py-0.5 text-xs font-medium text-sun">
                      <Sparkles size={12} strokeWidth={1.75} />
                      In the main pool!
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* feed */}
        <div className="mt-8">
          <h2 className="section-label">Group Feed</h2>
          {feed.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">
              No one&rsquo;s done a group challenge yet.
            </p>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              {feed.map((item) => (
                <FeedItemCard
                  key={item.completionId}
                  item={item}
                  isOwner={item.friend.id === viewerId}
                />
              ))}
            </div>
          )}
        </div>

        {/* owner controls */}
        {isOwner && (
          <div className="mt-10 flex flex-col gap-4">
            <h2 className="section-label">Group Settings</h2>
            <div className="card flex items-center justify-between p-4">
              <div>
                <p className="text-sm text-ink">Public group</p>
                <p className="text-xs text-ink-muted">
                  A challenge everyone finishes with no reports has a tiny chance of joining the
                  main daily pool.
                </p>
              </div>
              <Toggle checked={isPublic} onChange={handleTogglePublic} />
            </div>
            <button onClick={handleDeleteGroup} className="text-sm text-red-600">
              Delete group
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
