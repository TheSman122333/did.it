"use client";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
            redirectTo: `${location.origin}/auth/callback`,
        },
    });
  };

  return (
    <main className="min-h-screen flex items-center justify-center">
      <button
        onClick={signIn}
        className="px-4 py-2 bg-black text-white rounded"
      >
        Sign in with Google
      </button>
    </main>
  );
}