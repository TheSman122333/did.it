"use client";

import { useEffect, useState } from "react";
import { Camera, Flame, Users, Bell } from "lucide-react";
import { isPushSupported, subscribeToPush } from "@/lib/pushClient";

const STORAGE_KEY = "did-it:onboarded";

const steps = [
  {
    icon: Camera,
    title: "Get a daily challenge",
    body: "Every day there's one small challenge. Snap a photo to prove you did it.",
  },
  {
    icon: Flame,
    title: "Build a streak",
    body: "Complete the challenge each day to keep your streak going.",
  },
  {
    icon: Users,
    title: "Add friends",
    body: "Search for friends by handle and see who's done today's challenge.",
  },
];

export default function OnboardingModal() {
  const [stage, setStage] = useState<"closed" | "intro" | "notifications">("closed");
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (!window.localStorage.getItem(STORAGE_KEY)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStage("intro");
    }
  }, []);

  function finish() {
    window.localStorage.setItem(STORAGE_KEY, "true");
    setStage("closed");
  }

  function continueToNotifications() {
    if (isPushSupported()) {
      setStage("notifications");
    } else {
      finish();
    }
  }

  async function enableNotifications() {
    setSubscribing(true);
    try {
      await subscribeToPush();
    } finally {
      setSubscribing(false);
      finish();
    }
  }

  if (stage === "closed") return null;

  if (stage === "notifications") {
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 px-6">
        <div className="w-full max-w-sm rounded-2xl border border-ink-muted/15 bg-white p-6">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-sage-soft text-sage-dark">
            <Bell size={22} strokeWidth={1.75} />
          </span>
          <h1 className="mt-4 text-lg font-semibold text-ink">Turn on notifications?</h1>
          <p className="mt-2 text-sm text-ink-muted">
            We&rsquo;ll only notify you for three things: a friend claps on your post, comments
            on it, or completes today&rsquo;s challenge. Nothing else.
          </p>
          <button
            onClick={enableNotifications}
            disabled={subscribing}
            className="btn-primary mt-6 w-full"
          >
            {subscribing ? "..." : "Enable notifications"}
          </button>
          <button onClick={finish} className="btn-ghost mt-2 w-full">
            Not now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 px-6">
      <div className="w-full max-w-sm rounded-2xl border border-ink-muted/15 bg-white p-6">
        <h1 className="text-lg font-semibold text-ink">Welcome to did.it</h1>

        <ul className="mt-5 flex flex-col gap-4">
          {steps.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sage-soft text-sage-dark">
                <Icon size={18} strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-sm font-medium text-ink">{title}</p>
                <p className="text-sm text-ink-muted">{body}</p>
              </div>
            </li>
          ))}
        </ul>

        <button onClick={continueToNotifications} className="btn-primary mt-6 w-full">
          Got it
        </button>
      </div>
    </div>
  );
}
