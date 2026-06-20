"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Mounted globally (see layout.tsx) so this runs no matter which route a
// visitor lands on first, not just the Today page. getUser() actually
// re-validates against Supabase (unlike getSession(), which would trust a
// stale local token even if the underlying user row was deleted), so this
// correctly recovers from "the account this browser was signed into no
// longer exists" -- e.g. first ever visit, cookies cleared, or someone
// deleted the test accounts from the Supabase dashboard.
export default function AnonBootstrap() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) return;
      supabase.auth.signInAnonymously().then(() => router.refresh());
    });
  }, [router]);

  return null;
}
