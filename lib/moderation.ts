import { createClient } from "@/lib/supabase/server";

// RLS already blocks this, just gives a real error instead of a postgres one
export async function assertNotBanned(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data } = await supabase.from("profiles").select("banned").eq("id", userId).single();
  if (data?.banned) throw new Error("Your account has been suspended.");
}
