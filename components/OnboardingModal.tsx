"use client";

import { useEffect, useState } from "react";
import { Camera, Flame, Users } from "lucide-react";

const STORAGE_KEY = "did-it:onboarded";

const steps = [
  {
    icon: Camera,
    title: "Get a daily dare",
    body: "Every day there's one small challenge. Snap a photo to prove you did it.",
  },
  {
    icon: Flame,
    title: "Build a streak",
    body: "Complete the dare each day to keep your streak going.",
  },
  {
    icon: Users,
    title: "Add friends",
    body: "Search for friends by handle and see who's done today's dare.",
  },
];

export default function OnboardingModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Reads browser-only localStorage to decide whether to show the modal,
    // so this can't be known during SSR -- the one-time extra render here
    // is the unavoidable cost of syncing from that external client storage.
    if (!window.localStorage.getItem(STORAGE_KEY)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(true);
    }
  }, []);

  function dismiss() {
    window.localStorage.setItem(STORAGE_KEY, "true");
    setOpen(false);
  }

  if (!open) return null;

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

        <button onClick={dismiss} className="btn-primary mt-6 w-full">
          Got it
        </button>
      </div>
    </div>
  );
}
