"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthButton({ isAnonymous }: { isAnonymous: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // linkIdentity only succeeds the first time a Google identity is ever
  // attached to any account. For a returning user whose Google account
  // already has a real did.it account, Supabase reports the failure via a
  // URL hash error after the OAuth redirect back, not as a normal error
  // from the linkIdentity() call itself. Detect that case here and fall
  // back to a plain sign-in to their existing account instead.
  useEffect(() => {
    if (typeof window === "undefined" || !window.location.hash) return;

    const params = new URLSearchParams(window.location.hash.slice(1));
    const errorCode = params.get("error_code");
    if (!errorCode) return;

    window.history.replaceState(null, "", window.location.pathname);

    if (errorCode === "identity_already_exists") {
      const supabase = createClient();
      supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${location.origin}/auth/callback` },
      });
    } else {
      alert(params.get("error_description") ?? "Sign-in failed");
    }
  }, []);

  async function handleSignIn() {
    setLoading(true);
    const supabase = createClient();
    // Upgrades the current anonymous user to a permanent Google identity
    // (same user id, same data) instead of creating a separate account.
    const { error } = await supabase.auth.linkIdentity({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) {
      setLoading(false);
      alert(error.message);
    }
  }

  async function handleSignOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    await supabase.auth.signInAnonymously();
    router.refresh();
    setLoading(false);
  }

  if (isAnonymous) {
    return (
      <button onClick={handleSignIn} disabled={loading} className="btn-secondary">
        {loading ? "..." : "Sign in with Google"}
      </button>
    );
  }

  return (
    <button onClick={handleSignOut} disabled={loading} className="btn-secondary">
      {loading ? "..." : "Sign out"}
    </button>
  );
}
