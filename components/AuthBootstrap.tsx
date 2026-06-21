"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export default function AuthBootstrap() {
  const router = useRouter();
  const ranRef = useRef(false);

  useEffect(() => {
    // react double-fires this in dev and it was nuking real sessions randomly. found it, never again
    if (ranRef.current) return;
    ranRef.current = true;

    const supabase = createClient();

    if (window.location.hash) {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const errorCode = params.get("error_code");
      if (errorCode) {
        window.history.replaceState(null, "", window.location.pathname);
        if (errorCode === "identity_already_exists") {
          // google account already linked elsewhere, just sign in instead of linking
          supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: `${window.location.origin}/auth/callback` },
          });
        } else {
          alert(params.get("error_description") ?? "Sign-in failed");
        }
        return;
      }
    }

    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (user) return;
      // a network hiccup is not the same as "this account is gone", don't punish people for bad wifi
      if (error && isAuthRetryableFetchError(error)) return;
      supabase.auth.signInAnonymously().then(() => router.refresh());
    });
  }, [router]);

  return null;
}
