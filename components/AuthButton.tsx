"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthButton({ isAnonymous }: { isAnonymous: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setLoading(true);
    const supabase = createClient();
    // upgrades the anon account to google, same user id, keeps all the data
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
