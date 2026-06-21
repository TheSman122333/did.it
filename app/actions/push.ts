"use server";

import { createClient } from "@/lib/supabase/server";

export type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export async function savePushSubscription(subscription: PushSubscriptionInput) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not logged in");

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    { onConflict: "endpoint" }
  );

  if (error) throw error;
}

export async function deletePushSubscription(endpoint: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) throw error;
}

export async function getMyPushEndpoints(): Promise<string[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("push_subscriptions")
    .select("endpoint")
    .eq("user_id", user.id);

  return (data ?? []).map((row) => row.endpoint);
}
