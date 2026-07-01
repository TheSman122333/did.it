"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export default function AuthBootstrap() {
  const router = useRouter();
  const ranRef = useRef(false);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    // react strict mode double-invokes effects in dev, guard against that
    if (ranRef.current) return;
    ranRef.current = true;

    const supabase = createClient();

    if (window.location.hash) {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const errorCode = params.get("error_code");
      if (errorCode) {
        window.history.replaceState(null, "", window.location.pathname);
        if (errorCode === "identity_already_exists") {
          // identity is linked to another account, retry as a plain sign-in
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setRecovering(true);
          supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: `${window.location.origin}/auth/callback` },
          }).then(({ error: retryError }) => {
            // failed retry: clear the overlay instead of leaving it stuck indefinitely
            if (retryError) setRecovering(false);
          });
        } else {
          alert(params.get("error_description") ?? "Sign-in failed");
        }
        return;
      }
    }

    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (user) return;
      // transient network errors shouldn't trigger anonymous re-auth
      if (error && isAuthRetryableFetchError(error)) return;
      supabase.auth.signInAnonymously().then(() => router.refresh());
    });
  }, [router]);

  if (recovering) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-paper">
        <p className="text-ink-muted">Signing you in...</p>
      </div>
    );
  }

  return null;
}
