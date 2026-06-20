"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Renders only when there is no session at all (not even anonymous) --
// e.g. first ever visit, or cookies cleared. Silently creates an anonymous
// Supabase session so the app is usable without an explicit sign-up step,
// then refreshes so the server component re-renders with a real user.
export default function AnonBootstrap() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.signInAnonymously().then(() => router.refresh());
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper">
      <p className="text-ink-muted">Loading...</p>
    </main>
  );
}
